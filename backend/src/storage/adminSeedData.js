const nowIso = () => new Date().toISOString();
const daysAgoIso = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const daysFromNowIso = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

export const createDefaultArtworks = () => [
  {
    id: 1,
    title: 'Golden Horizon',
    artist: 'Layla Mansour',
    price: 480,
    category: 'Abstract',
    subcategory: 'Contemporary',
    productType: 'artwork',
    style: 'Contemporary',
    size: 'Large',
    dimensions: '80 x 100 cm',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80'
    ],
    isNew: true,
    isFeatured: true,
    frameColor: 'Gold',
    description:
      'A breathtaking abstract piece capturing the warmth of golden light across an open horizon.',
    tags: ['abstract', 'gold', 'contemporary', 'warm'],
    stockQuantity: 10,
    inStock: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 2,
    title: 'Midnight Blue Serenity',
    artist: 'Karim El-Rashid',
    price: 620,
    originalPrice: 780,
    category: 'Abstract',
    subcategory: 'Modern',
    productType: 'artwork',
    style: 'Modern',
    size: 'XLarge',
    dimensions: '100 x 120 cm',
    image: 'https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&q=80',
      'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80'
    ],
    isBestseller: true,
    isFeatured: true,
    frameColor: 'Black',
    description:
      'Deep oceanic blues swirl into a meditative composition that transforms any living space.',
    tags: ['abstract', 'blue', 'modern', 'calming'],
    stockQuantity: 10,
    inStock: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const createDefaultBlogPosts = () => [
  {
    id: 1,
    title: "The Art of Collecting: A Beginner's Guide",
    slug: 'art-of-collecting-beginners-guide',
    excerpt:
      'Discover the joy of art collecting with our comprehensive guide for beginners. Learn how to start your collection with confidence.',
    content: `<p>Starting an art collection can be one of the most rewarding experiences of your life. Whether you're drawn to contemporary abstract pieces or classic landscapes, the journey of building a collection is both personal and enriching.</p>

<h2>Why Start Collecting Art?</h2>
<p>Art collecting isn't just for the wealthy or the highly educated. It's for anyone who appreciates beauty, wants to express their personality through their living space, and enjoys supporting artists.</p>

<h2>Setting Your Budget</h2>
<p>One of the first questions new collectors ask is: "How much should I spend?" The answer is simple: start with what you're comfortable with. Our collection features pieces ranging from $295 to $1,200, making fine art accessible to everyone.</p>

<h2>Trusting Your Instincts</h2>
<p>The most important rule in art collecting is to buy what you love. Don't worry about trends or investment potential when you're starting out. Choose pieces that speak to you personally.</p>

<h2>Building Your Collection</h2>
<p>Start with one or two pieces that truly resonate with you. As your collection grows, you'll develop a better understanding of your tastes and preferences.</p>

<p>Ready to start your collection? Browse our curated selection of premium artworks and find the perfect piece for your space.</p>`,
    featuredImage: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
    author: 'Sinipo Art Team',
    category: 'Art Tips',
    tags: ['collecting', 'beginners', 'art tips', 'guide'],
    isPublished: true,
    isFeatured: true,
    publishedAt: daysAgoIso(7),
    createdAt: daysAgoIso(7),
    updatedAt: nowIso(),
    views: 245,
    readTime: 5
  },
  {
    id: 2,
    title: 'Understanding Abstract Art: Beyond the Canvas',
    slug: 'understanding-abstract-art-beyond-canvas',
    excerpt:
      'Explore the deeper meanings behind abstract art and learn how to appreciate the emotional depth of non-representational works.',
    content: `<p>Abstract art often gets a bad reputation. "My child could paint that," is a common refrain. But understanding abstract art opens up a world of emotional depth and artistic expression that goes far beyond simple representation.</p>

<h2>What is Abstract Art?</h2>
<p>Abstract art doesn't try to represent reality directly. Instead, it uses shapes, colors, forms, and gestural marks to achieve its effect. This doesn't mean it's random or without meaning.</p>

<h2>The Emotional Impact</h2>
<p>Abstract art speaks directly to our emotions. A bold red canvas might evoke passion or anger, while soft blues can create feelings of calm and tranquility. The power lies in how it makes you feel.</p>

<h2>Famous Abstract Artists</h2>
<p>Artists like Wassily Kandinsky, Piet Mondrian, and Mark Rothko revolutionized the art world by moving away from representational art. Their work continues to inspire collectors and artists today.</p>

<h2>How to Appreciate Abstract Art</h2>
<p>When viewing abstract art, let go of the need to "understand" it. Instead, focus on your emotional response. What feelings does the piece evoke? What memories does it trigger?</p>

<p>Our collection features stunning abstract pieces that can transform any space. Each work tells a unique story through color and form.</p>`,
    featuredImage: 'https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&q=80',
    author: 'Layla Mansour',
    category: 'Art Education',
    tags: ['abstract', 'art education', 'contemporary', 'understanding art'],
    isPublished: true,
    isFeatured: false,
    publishedAt: daysAgoIso(3),
    createdAt: daysAgoIso(3),
    updatedAt: nowIso(),
    views: 189,
    readTime: 4
  },
  {
    id: 3,
    title: 'Framing Your Art: A Complete Guide',
    slug: 'framing-your-art-complete-guide',
    excerpt:
      'Learn how the right frame can enhance your artwork and complement your interior design. Tips from our expert curators.',
    content: `<p>The right frame can make or break an artwork. It's not just about protection—it's about presentation, style, and creating the perfect visual harmony in your space.</p>

<h2>Why Framing Matters</h2>
<p>A frame serves multiple purposes: it protects the artwork, enhances its visual appeal, and helps it integrate with your interior design. The wrong frame can distract from the art, while the right one elevates it.</p>

<h2>Frame Styles for Different Artworks</h2>
<p><strong>Gold Frames:</strong> Perfect for classical, traditional, or luxurious pieces. They add warmth and elegance.</p>
<p><strong>Black Frames:</strong> Ideal for modern, contemporary, or minimalist art. They create clean lines and focus.</p>
<p><strong>White Frames:</strong> Great for light, airy pieces or when you want the art to be the sole focus.</p>
<p><strong>Walnut Frames:</strong> Excellent for earthy, natural, or mid-century modern pieces.</p>

<h2>Matching Frames to Your Decor</h2>
<p>Consider your room's color scheme, furniture style, and overall aesthetic when choosing frames. The frame should complement both the art and the space.</p>

<p>All our artworks come with carefully selected frames that enhance each piece. We offer Gold, Black, Silver, White, and Walnut options to suit any decor.</p>`,
    featuredImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    author: 'Karim El-Rashid',
    category: 'Art Tips',
    tags: ['framing', 'interior design', 'art tips', 'home decor'],
    isPublished: true,
    isFeatured: true,
    publishedAt: daysAgoIso(1),
    createdAt: daysAgoIso(1),
    updatedAt: nowIso(),
    views: 156,
    readTime: 6
  }
];

export const createDefaultDiscountCodes = () => [
  {
    id: 1,
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minOrderAmount: 100,
    maxDiscount: 50,
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
    validFrom: nowIso(),
    validUntil: daysFromNowIso(30),
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: 2,
    code: 'SAVE20',
    type: 'fixed',
    value: 20,
    minOrderAmount: 200,
    maxDiscount: 20,
    usageLimit: 50,
    usedCount: 0,
    isActive: true,
    validFrom: nowIso(),
    validUntil: daysFromNowIso(60),
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

export const createDefaultMediaAssets = () => {
  const assets = [];
  const seen = new Set();

  const pushAsset = (url, type, title) => {
    if (!url || seen.has(url)) {
      return;
    }

    seen.add(url);
    assets.push({
      id: assets.length + 1,
      url,
      type,
      title,
      altText: title,
      mimeType: 'image/webp',
      size: null,
      width: null,
      height: null,
      storageType: 'remote',
      publicId: null,
      source: 'seed',
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  };

  createDefaultArtworks().forEach((artwork) => {
    [artwork.image, ...(artwork.images || [])].forEach((url) =>
      pushAsset(url, artwork.productType === 'fashion' ? 'general' : 'artwork', artwork.title)
    );
  });

  createDefaultBlogPosts().forEach((post) => {
    pushAsset(post.featuredImage, 'blog', post.title);
  });

  return assets;
};
