import { users } from './authController.js';
import { getBucket, getUserBucketValue } from '../storage/persistentState.js';

const getReviewsForUser = (userId) => getUserBucketValue('userReviews', userId, []);
const getAllReviews = () => Object.values(getBucket('userReviews')).flat();

// In-memory storage for social features
let userFollows = new Map();
let userGalleries = new Map();
let socialShares = new Map();
let userActivities = new Map();

// Initialize with sample data
const initializeSocialData = () => {
  // Sample follows (user follows artist)
  userFollows.set(1, [1, 2]); // User 1 follows artists 1 and 2
  
  // Sample user galleries
  userGalleries.set(1, [
    {
      id: 1,
      name: "My Living Room Collection",
      description: "Art pieces for my modern living space",
      artworks: [1, 3],
      isPublic: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);

  // Sample activities
  userActivities.set(1, [
    {
      id: 1,
      type: "purchase",
      description: "Purchased 'Golden Horizon'",
      productId: 1,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      type: "review",
      description: "Reviewed 'Midnight Blue Serenity'",
      productId: 2,
      rating: 5,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
};

initializeSocialData();

// Get User Public Profile
export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = users.find(u => u.id === parseInt(userId));
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const reviews = getReviewsForUser(parseInt(userId));
    const galleries = userGalleries.get(parseInt(userId)) || [];
    const activities = userActivities.get(parseInt(userId)) || [];
    const followers = Array.from(userFollows.entries())
      .filter(([_, follows]) => follows.includes(parseInt(userId)))
      .map(([userId]) => userId);

    const publicProfile = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      reviewCount: reviews.length,
      averageRating: reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      galleryCount: galleries.filter(g => g.isPublic).length,
      followerCount: followers.length,
      recentActivity: activities.slice(0, 5),
      publicGalleries: galleries.filter(g => g.isPublic)
    };

    res.json({
      success: true,
      data: publicProfile
    });

  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      error: 'Failed to get public profile',
      message: error.message
    });
  }
};

// Follow User/Artist
export const followUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        error: 'Target user ID is required'
      });
    }

    if (userId === parseInt(targetUserId)) {
      return res.status(400).json({
        error: 'Cannot follow yourself'
      });
    }

    const follows = userFollows.get(userId) || [];
    
    if (!follows.includes(parseInt(targetUserId))) {
      follows.push(parseInt(targetUserId));
      userFollows.set(userId, follows);

      // Add activity
      const activities = userActivities.get(userId) || [];
      activities.unshift({
        id: Math.max(...activities.map(a => a.id), 0) + 1,
        type: "follow",
        description: `Started following user ${targetUserId}`,
        targetUserId: parseInt(targetUserId),
        date: new Date().toISOString()
      });
      userActivities.set(userId, activities);
    }

    res.json({
      success: true,
      message: 'User followed successfully',
      data: follows
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      error: 'Failed to follow user',
      message: error.message
    });
  }
};

// Unfollow User/Artist
export const unfollowUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.params;

    const follows = userFollows.get(userId) || [];
    const updatedFollows = follows.filter(id => id !== parseInt(targetUserId));
    userFollows.set(userId, updatedFollows);

    res.json({
      success: true,
      message: 'User unfollowed successfully',
      data: updatedFollows
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      error: 'Failed to unfollow user',
      message: error.message
    });
  }
};

// Get User Follows
export const getUserFollows = async (req, res) => {
  try {
    const userId = req.user.userId;
    const follows = userFollows.get(userId) || [];
    
    res.json({
      success: true,
      data: follows
    });

  } catch (error) {
    console.error('Get user follows error:', error);
    res.status(500).json({
      error: 'Failed to get user follows',
      message: error.message
    });
  }
};

// Create User Gallery
export const createGallery = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, artworks, isPublic } = req.body;

    if (!name || !artworks || !Array.isArray(artworks)) {
      return res.status(400).json({
        error: 'Gallery name and artworks array are required'
      });
    }

    const galleries = userGalleries.get(userId) || [];
    
    const newGallery = {
      id: Math.max(...galleries.map(g => g.id), 0) + 1,
      name,
      description: description || '',
      artworks,
      isPublic: isPublic !== false,
      createdAt: new Date().toISOString()
    };

    galleries.push(newGallery);
    userGalleries.set(userId, galleries);

    // Add activity
    const activities = userActivities.get(userId) || [];
    activities.unshift({
      id: Math.max(...activities.map(a => a.id), 0) + 1,
      type: "gallery",
      description: `Created gallery "${name}"`,
      galleryId: newGallery.id,
      date: new Date().toISOString()
    });
    userActivities.set(userId, activities);

    res.status(201).json({
      success: true,
      message: 'Gallery created successfully',
      data: newGallery
    });

  } catch (error) {
    console.error('Create gallery error:', error);
    res.status(500).json({
      error: 'Failed to create gallery',
      message: error.message
    });
  }
};

// Get User Galleries
export const getUserGalleries = async (req, res) => {
  try {
    const userId = req.user.userId;
    const galleries = userGalleries.get(userId) || [];
    
    res.json({
      success: true,
      data: galleries
    });

  } catch (error) {
    console.error('Get user galleries error:', error);
    res.status(500).json({
      error: 'Failed to get user galleries',
      message: error.message
    });
  }
};

// Update Gallery
export const updateGallery = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;

    const galleries = userGalleries.get(userId) || [];
    const galleryIndex = galleries.findIndex(g => g.id === parseInt(id));

    if (galleryIndex === -1) {
      return res.status(404).json({
        error: 'Gallery not found'
      });
    }

    galleries[galleryIndex] = { ...galleries[galleryIndex], ...updateData };
    userGalleries.set(userId, galleries);

    res.json({
      success: true,
      message: 'Gallery updated successfully',
      data: galleries[galleryIndex]
    });

  } catch (error) {
    console.error('Update gallery error:', error);
    res.status(500).json({
      error: 'Failed to update gallery',
      message: error.message
    });
  }
};

// Delete Gallery
export const deleteGallery = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const galleries = userGalleries.get(userId) || [];
    const updatedGalleries = galleries.filter(g => g.id !== parseInt(id));
    userGalleries.set(userId, updatedGalleries);

    res.json({
      success: true,
      message: 'Gallery deleted successfully'
    });

  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({
      error: 'Failed to delete gallery',
      message: error.message
    });
  }
};

// Share Artwork
export const shareArtwork = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, platform, message } = req.body;

    if (!productId || !platform) {
      return res.status(400).json({
        error: 'Product ID and platform are required'
      });
    }

    const shares = socialShares.get(userId) || [];
    
    const newShare = {
      id: Math.max(...shares.map(s => s.id), 0) + 1,
      productId,
      platform,
      message: message || '',
      date: new Date().toISOString()
    };

    shares.push(newShare);
    socialShares.set(userId, shares);

    // Add activity
    const activities = userActivities.get(userId) || [];
    activities.unshift({
      id: Math.max(...activities.map(a => a.id), 0) + 1,
      type: "share",
      description: `Shared artwork on ${platform}`,
      productId,
      platform,
      date: new Date().toISOString()
    });
    userActivities.set(userId, activities);

    res.status(201).json({
      success: true,
      message: 'Artwork shared successfully',
      data: newShare
    });

  } catch (error) {
    console.error('Share artwork error:', error);
    res.status(500).json({
      error: 'Failed to share artwork',
      message: error.message
    });
  }
};

// Get User Activity Feed
export const getActivityFeed = async (req, res) => {
  try {
    const userId = req.user.userId;
    const activities = userActivities.get(userId) || [];
    
    res.json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({
      error: 'Failed to get activity feed',
      message: error.message
    });
  }
};

// Get Social Statistics
export const getSocialStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const follows = userFollows.get(userId) || [];
    const galleries = userGalleries.get(userId) || [];
    const shares = socialShares.get(userId) || [];
    const activities = userActivities.get(userId) || [];

    const stats = {
      followingCount: follows.length,
      galleryCount: galleries.length,
      shareCount: shares.length,
      activityCount: activities.length,
      publicGalleries: galleries.filter(g => g.isPublic).length
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get social stats error:', error);
    res.status(500).json({
      error: 'Failed to get social statistics',
      message: error.message
    });
  }
};

// Get Trending Artworks (based on shares and reviews)
export const getTrendingArtworks = async (req, res) => {
  try {
    // Simple trending logic based on recent activity
    // In production, this would use more sophisticated algorithms
    const allShares = Array.from(socialShares.values()).flat();
    const allReviews = getAllReviews();

    // Count shares per product
    const shareCounts = {};
    allShares.forEach(share => {
      shareCounts[share.productId] = (shareCounts[share.productId] || 0) + 1;
    });

    // Count reviews per product
    const reviewCounts = {};
    allReviews.forEach(review => {
      reviewCounts[review.productId] = (reviewCounts[review.productId] || 0) + 1;
    });

    // Combine scores
    const productScores = {};
    Object.keys(shareCounts).forEach(productId => {
      productScores[productId] = (shareCounts[productId] || 0) + (reviewCounts[productId] || 0);
    });

    // Sort by score and get top 5
    const trending = Object.entries(productScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([productId]) => parseInt(productId));

    res.json({
      success: true,
      data: trending
    });

  } catch (error) {
    console.error('Get trending artworks error:', error);
    res.status(500).json({
      error: 'Failed to get trending artworks',
      message: error.message
    });
  }
};

// Export for use in other modules
export { userFollows, userGalleries, socialShares, userActivities };
