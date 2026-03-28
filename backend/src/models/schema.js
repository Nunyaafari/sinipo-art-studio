import { pgTable, serial, text, integer, boolean, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull().default('user'),
  isVerified: boolean('is_verified').default(false),
  verificationToken: text('verification_token'),
  resetPasswordToken: text('reset_password_token'),
  resetPasswordExpires: timestamp('reset_password_expires'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  country: text('country'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products table (artworks and fashion)
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  category: text('category').notNull(),
  subcategory: text('subcategory').notNull(),
  productType: text('product_type').notNull(), // 'artwork' or 'fashion'
  size: text('size').notNull(),
  dimensions: text('dimensions'),
  clothingSize: text('clothing_size'),
  color: text('color'),
  material: text('material'),
  image: text('image').notNull(),
  images: jsonb('images'), // Array of image URLs
  isNew: boolean('is_new').default(false),
  isFeatured: boolean('is_featured').default(false),
  isBestseller: boolean('is_bestseller').default(false),
  frameColor: text('frame_color'),
  description: text('description').notNull(),
  tags: jsonb('tags'), // Array of tags
  inStock: boolean('in_stock').default(true),
  stockQuantity: integer('stock_quantity').default(1),
  careInstructions: text('care_instructions'),
  style: text('style'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  email: text('email').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  customerInfo: jsonb('customer_info').notNull(),
  items: jsonb('items').notNull(),
  discountCode: text('discount_code'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  paystackReference: text('paystack_reference'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User wishlists
export const wishlists = pgTable('wishlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// User addresses
export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  label: text('label').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  phone: text('phone').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Product reviews
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Loyalty points
export const loyaltyPoints = pgTable('loyalty_points', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  points: integer('points').default(0),
  tier: text('tier').default('Bronze'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User follows
export const userFollows = pgTable('user_follows', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  targetUserId: integer('target_user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// User galleries
export const userGalleries = pgTable('user_galleries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  artworks: jsonb('artworks'), // Array of product IDs
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Social shares
export const socialShares = pgTable('social_shares', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  platform: text('platform').notNull(),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// User activities
export const userActivities = pgTable('user_activities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  productId: integer('product_id').references(() => products.id),
  targetUserId: integer('target_user_id').references(() => users.id),
  galleryId: integer('gallery_id').references(() => userGalleries.id),
  platform: text('platform'),
  rating: integer('rating'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Blog posts
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  featuredImage: text('featured_image').notNull(),
  author: text('author').notNull(),
  category: text('category').notNull(),
  tags: jsonb('tags'), // Array of tags
  isPublished: boolean('is_published').default(false),
  isFeatured: boolean('is_featured').default(false),
  publishedAt: timestamp('published_at'),
  views: integer('views').default(0),
  readTime: integer('read_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Discount codes
export const discountCodes = pgTable('discount_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // 'percentage' or 'fixed'
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }).default('0'),
  maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0),
  isActive: boolean('is_active').default(true),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Analytics data
export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'page_view', 'product_view', 'purchase', etc.
  data: jsonb('data').notNull(),
  userId: integer('user_id').references(() => users.id),
  productId: integer('product_id').references(() => products.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Runtime application state snapshots
export const runtimeState = pgTable('runtime_state', {
  stateKey: text('state_key').primaryKey(),
  stateValue: jsonb('state_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
