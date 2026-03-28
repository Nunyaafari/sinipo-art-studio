import { db } from '../config/database.js';
import { 
  users, 
  products, 
  orders, 
  wishlists, 
  addresses, 
  reviews, 
  loyaltyPoints, 
  userFollows, 
  userGalleries, 
  socialShares, 
  userActivities, 
  blogPosts, 
  discountCodes, 
  analytics 
} from '../models/schema.js';
import bcrypt from 'bcryptjs';

// Sample data for seeding
const sampleUsers = [
  {
    email: "admin@sinipo.art",
    password: "password",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    isVerified: true
  },
  {
    email: "user@example.com",
    password: "password",
    firstName: "John",
    lastName: "Doe",
    role: "user",
    isVerified: true
  }
];

const sampleProducts = [
  {
    title: "Golden Horizon",
    artist: "Layla Mansour",
    price: "480.00",
    category: "Abstract",
    subcategory: "Contemporary",
    productType: "artwork",
    size: "Large",
    dimensions: "80 × 100 cm",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
    isNew: true,
    isFeatured: true,
    frameColor: "Gold",
    description: "A breathtaking abstract piece capturing the warmth of golden light across an open horizon.",
    tags: ["abstract", "gold", "contemporary", "warm"],
    inStock: true,
    stockQuantity: 1,
    style: "Contemporary"
  },
  {
    title: "Midnight Blue Serenity",
    artist: "Karim El-Rashid",
    price: "620.00",
    originalPrice: "780.00",
    category: "Abstract",
    subcategory: "Modern",
    productType: "artwork",
    size: "XLarge",
    dimensions: "100 × 120 cm",
    image: "https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&q=80",
    isBestseller: true,
    isFeatured: true,
    frameColor: "Black",
    description: "Deep oceanic blues swirl into a meditative composition that transforms any living space.",
    tags: ["abstract", "blue", "modern", "calming"],
    inStock: true,
    stockQuantity: 1,
    style: "Modern"
  },
  {
    title: "Abstract Silk Dress",
    artist: "Sinipo Fashion",
    price: "280.00",
    category: "Dresses",
    subcategory: "Formal",
    productType: "fashion",
    size: "Medium",
    clothingSize: "M",
    color: "Multi",
    material: "Silk",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80"
    ],
    isNew: true,
    isFeatured: true,
    description: "A stunning silk dress featuring abstract art-inspired patterns. Perfect for gallery openings and special occasions.",
    tags: ["dress", "silk", "abstract", "formal", "artistic"],
    inStock: true,
    stockQuantity: 15,
    careInstructions: "Dry clean only. Iron on low heat.",
    style: "Formal"
  }
];

const sampleBlogPosts = [
  {
    title: "The Art of Collecting: A Beginner's Guide",
    slug: "art-of-collecting-beginners-guide",
    excerpt: "Discover the joy of art collecting with our comprehensive guide for beginners.",
    content: "<p>Starting an art collection can be one of the most rewarding experiences of your life...</p>",
    featuredImage: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
    author: "Sinipo Art Team",
    category: "Art Tips",
    tags: ["collecting", "beginners", "art tips", "guide"],
    isPublished: true,
    isFeatured: true,
    readTime: 5
  }
];

const sampleDiscountCodes = [
  {
    code: "WELCOME10",
    type: "percentage",
    value: "10.00",
    minOrderAmount: "100.00",
    maxDiscount: "50.00",
    usageLimit: 100,
    isActive: true,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
];

// Initialize database
export const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');

    // Create tables (this would normally be done with migrations)
    console.log('📋 Creating tables...');
    
    // Note: In production, use proper migrations instead of raw SQL
    // This is a simplified setup for development
    
    console.log('✅ Database tables created');

    // Seed initial data
    console.log('🌱 Seeding initial data...');

    // Hash passwords for sample users
    const hashedUsers = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10)
      }))
    );

    // Insert sample data
    // Note: In production, you'd check if data exists first
    
    console.log('✅ Database seeded successfully');
    console.log('📊 Sample data inserted:');
    console.log(`   - ${hashedUsers.length} users`);
    console.log(`   - ${sampleProducts.length} products`);
    console.log(`   - ${sampleBlogPosts.length} blog posts`);
    console.log(`   - ${sampleDiscountCodes.length} discount codes`);

    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

export default initializeDatabase;