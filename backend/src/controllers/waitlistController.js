import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// In-memory storage for waitlist (replace with database in production)
let waitlistSubscriptions = new Map();
let collections = new Map();

// Initialize with sample collections
const initializeCollections = () => {
  collections.set('summer-2026', {
    id: 'summer-2026',
    name: 'Summer 2026 Collection',
    description: 'A vibrant collection inspired by Mediterranean sunsets and coastal living',
    launchDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
    subscriberCount: 0,
    createdAt: new Date().toISOString()
  });

  collections.set('autumn-winter-2026', {
    id: 'autumn-winter-2026',
    name: 'Autumn/Winter 2026 Collection',
    description: 'Rich textures and warm tones for the cooler seasons',
    launchDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&q=80',
    subscriberCount: 0,
    createdAt: new Date().toISOString()
  });

  collections.set('limited-edition-spring', {
    id: 'limited-edition-spring',
    name: 'Limited Edition Spring Series',
    description: 'Exclusive limited edition pieces celebrating renewal and growth',
    launchDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    subscriberCount: 0,
    createdAt: new Date().toISOString()
  });
};

initializeCollections();

// Get all collections
export const getCollections = async (req, res) => {
  try {
    const { status } = req.query;
    
    let collectionList = Array.from(collections.values());
    
    if (status) {
      collectionList = collectionList.filter(c => c.status === status);
    }

    // Sort by launch date
    collectionList.sort((a, b) => new Date(a.launchDate) - new Date(b.launchDate));

    res.json({
      success: true,
      data: collectionList
    });

  } catch (error) {
    logger.error('Get collections error:', error);
    res.status(500).json({
      error: 'Failed to get collections',
      message: error.message
    });
  }
};

// Get collection by ID
export const getCollection = async (req, res) => {
  try {
    const { id } = req.params;
    
    const collection = collections.get(id);
    
    if (!collection) {
      return res.status(404).json({
        error: 'Collection not found'
      });
    }

    res.json({
      success: true,
      data: collection
    });

  } catch (error) {
    logger.error('Get collection error:', error);
    res.status(500).json({
      error: 'Failed to get collection',
      message: error.message
    });
  }
};

// Join waitlist for collection
export const joinWaitlist = async (req, res) => {
  try {
    const { collectionId, email, firstName, lastName } = req.body;

    if (!collectionId || !email) {
      return res.status(400).json({
        error: 'Collection ID and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if collection exists
    const collection = collections.get(collectionId);
    if (!collection) {
      return res.status(404).json({
        error: 'Collection not found'
      });
    }

    // Check if already subscribed
    const existingSubscriptions = waitlistSubscriptions.get(email) || [];
    if (existingSubscriptions.some(sub => sub.collectionId === collectionId)) {
      return res.status(400).json({
        error: 'Already subscribed to this collection'
      });
    }

    // Create subscription
    const subscription = {
      id: uuidv4(),
      collectionId,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      subscribedAt: new Date().toISOString(),
      status: 'active',
      notified: false
    };

    // Store subscription
    existingSubscriptions.push(subscription);
    waitlistSubscriptions.set(email, existingSubscriptions);

    // Update collection subscriber count
    collection.subscriberCount += 1;
    collections.set(collectionId, collection);

    logger.info('User joined waitlist', {
      collectionId,
      email,
      collectionName: collection.name
    });

    res.status(201).json({
      success: true,
      message: 'Successfully joined the waitlist',
      data: {
        subscriptionId: subscription.id,
        collectionName: collection.name,
        launchDate: collection.launchDate
      }
    });

  } catch (error) {
    logger.error('Join waitlist error:', error);
    res.status(500).json({
      error: 'Failed to join waitlist',
      message: error.message
    });
  }
};

// Leave waitlist
export const leaveWaitlist = async (req, res) => {
  try {
    const { collectionId, email } = req.body;

    if (!collectionId || !email) {
      return res.status(400).json({
        error: 'Collection ID and email are required'
      });
    }

    const subscriptions = waitlistSubscriptions.get(email) || [];
    const updatedSubscriptions = subscriptions.filter(sub => sub.collectionId !== collectionId);
    
    if (subscriptions.length === updatedSubscriptions.length) {
      return res.status(404).json({
        error: 'Subscription not found'
      });
    }

    waitlistSubscriptions.set(email, updatedSubscriptions);

    // Update collection subscriber count
    const collection = collections.get(collectionId);
    if (collection) {
      collection.subscriberCount = Math.max(0, collection.subscriberCount - 1);
      collections.set(collectionId, collection);
    }

    logger.info('User left waitlist', { collectionId, email });

    res.json({
      success: true,
      message: 'Successfully left the waitlist'
    });

  } catch (error) {
    logger.error('Leave waitlist error:', error);
    res.status(500).json({
      error: 'Failed to leave waitlist',
      message: error.message
    });
  }
};

// Get user's waitlist subscriptions
export const getUserSubscriptions = async (req, res) => {
  try {
    const { email } = req.params;

    const subscriptions = waitlistSubscriptions.get(email) || [];
    
    // Get collection details for each subscription
    const subscriptionsWithDetails = subscriptions.map(sub => {
      const collection = collections.get(sub.collectionId);
      return {
        ...sub,
        collectionName: collection?.name || 'Unknown Collection',
        launchDate: collection?.launchDate,
        collectionImage: collection?.image
      };
    });

    res.json({
      success: true,
      data: subscriptionsWithDetails
    });

  } catch (error) {
    logger.error('Get user subscriptions error:', error);
    res.status(500).json({
      error: 'Failed to get subscriptions',
      message: error.message
    });
  }
};

// Get waitlist statistics (admin)
export const getWaitlistStats = async (req, res) => {
  try {
    const totalSubscriptions = Array.from(waitlistSubscriptions.values())
      .flat().length;
    
    const collectionStats = Array.from(collections.values()).map(collection => ({
      id: collection.id,
      name: collection.name,
      subscriberCount: collection.subscriberCount,
      launchDate: collection.launchDate,
      status: collection.status
    }));

    const stats = {
      totalSubscriptions,
      totalCollections: collections.size,
      collectionStats,
      recentSubscriptions: Array.from(waitlistSubscriptions.values())
        .flat()
        .sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt))
        .slice(0, 10)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get waitlist stats error:', error);
    res.status(500).json({
      error: 'Failed to get waitlist statistics',
      message: error.message
    });
  }
};

// Notify subscribers when collection launches
export const notifySubscribers = async (req, res) => {
  try {
    const { collectionId } = req.body;

    const collection = collections.get(collectionId);
    if (!collection) {
      return res.status(404).json({
        error: 'Collection not found'
      });
    }

    // Find all subscribers for this collection
    const allSubscriptions = Array.from(waitlistSubscriptions.values()).flat();
    const collectionSubscriptions = allSubscriptions.filter(
      sub => sub.collectionId === collectionId && !sub.notified
    );

    // Mark as notified
    collectionSubscriptions.forEach(sub => {
      sub.notified = true;
    });

    // Update collection status
    collection.status = 'launched';
    collections.set(collectionId, collection);

    logger.info('Collection launch notifications sent', {
      collectionId,
      collectionName: collection.name,
      subscriberCount: collectionSubscriptions.length
    });

    res.json({
      success: true,
      message: `Notifications sent to ${collectionSubscriptions.length} subscribers`,
      data: {
        collectionName: collection.name,
        notifiedCount: collectionSubscriptions.length
      }
    });

  } catch (error) {
    logger.error('Notify subscribers error:', error);
    res.status(500).json({
      error: 'Failed to notify subscribers',
      message: error.message
    });
  }
};

// Export for use in other modules
export { waitlistSubscriptions, collections };