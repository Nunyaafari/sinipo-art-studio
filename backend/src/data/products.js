const cloneProduct = (product) => JSON.parse(JSON.stringify(product));

// Backend products data - mirrors frontend data structure
export const products = [
  // ARTWORKS
  {
    id: 1,
    sku: "SIN-001",
    title: "Golden Horizon",
    artist: "Layla Mansour",
    price: 480,
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
    stockQuantity: 10,
    lowStockThreshold: 3,
    style: "Contemporary",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    sku: "SIN-002",
    title: "Midnight Blue Serenity",
    artist: "Karim El-Rashid",
    price: 620,
    originalPrice: 780,
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
    stockQuantity: 10,
    lowStockThreshold: 3,
    style: "Modern",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // FASHION ITEMS
  {
    id: 101,
    sku: "SIN-FASH-101",
    title: "Abstract Silk Dress",
    artist: "Sinipo Fashion",
    price: 280,
    category: "Dresses",
    subcategory: "Formal",
    productType: "fashion",
    size: "Medium",
    dimensions: "Size M",
    frameColor: "N/A",
    clothingSize: "M",
    color: "Multi",
    material: "Silk",
    variants: [
      { id: "101-s-multi-s", sku: "SIN-FASH-101-S", size: "S", color: "Multi", material: "Silk", stockQuantity: 4, isDefault: true },
      { id: "101-s-multi-m", sku: "SIN-FASH-101-M", size: "M", color: "Multi", material: "Silk", stockQuantity: 6 },
      { id: "101-s-multi-l", sku: "SIN-FASH-101-L", size: "L", color: "Multi", material: "Silk", stockQuantity: 5 }
    ],
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
    lowStockThreshold: 3,
    careInstructions: "Dry clean only. Iron on low heat.",
    style: "Formal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 102,
    sku: "SIN-FASH-102",
    title: "Geometric Print Blouse",
    artist: "Sinipo Fashion",
    price: 120,
    category: "Tops",
    subcategory: "Casual",
    productType: "fashion",
    size: "Large",
    dimensions: "Size L",
    frameColor: "N/A",
    clothingSize: "L",
    color: "White",
    material: "Cotton",
    variants: [
      { id: "102-white-m", sku: "SIN-FASH-102-M-WHT", size: "M", color: "White", material: "Cotton", stockQuantity: 8, isDefault: true },
      { id: "102-white-l", sku: "SIN-FASH-102-L-WHT", size: "L", color: "White", material: "Cotton", stockQuantity: 10 },
      { id: "102-navy-l", sku: "SIN-FASH-102-L-NVY", size: "L", color: "Navy", material: "Cotton", stockQuantity: 7 }
    ],
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80",
    isBestseller: true,
    description: "A comfortable cotton blouse with geometric patterns inspired by modern art movements.",
    tags: ["blouse", "cotton", "geometric", "casual", "artistic"],
    inStock: true,
    stockQuantity: 25,
    lowStockThreshold: 4,
    careInstructions: "Machine wash cold. Tumble dry low.",
    style: "Casual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 103,
    sku: "SIN-FASH-103",
    title: "Artist's Canvas Tote",
    artist: "Sinipo Fashion",
    price: 85,
    category: "Bags",
    subcategory: "Accessories",
    productType: "fashion",
    size: "Large",
    dimensions: "40 × 35 × 15 cm",
    frameColor: "N/A",
    color: "Beige",
    material: "Canvas",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80",
    isNew: true,
    description: "A spacious canvas tote bag perfect for carrying art supplies, books, or everyday essentials.",
    tags: ["bag", "canvas", "tote", "artist", "practical"],
    inStock: true,
    stockQuantity: 50,
    lowStockThreshold: 5,
    careInstructions: "Spot clean with damp cloth.",
    style: "Casual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 104,
    sku: "SIN-FASH-104",
    title: "Brushstroke Scarf",
    artist: "Sinipo Fashion",
    price: 65,
    category: "Accessories",
    subcategory: "Scarves",
    productType: "fashion",
    size: "Medium",
    dimensions: "180 × 70 cm",
    frameColor: "N/A",
    color: "Multi",
    material: "Silk",
    image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80",
    isFeatured: true,
    description: "A luxurious silk scarf featuring hand-painted brushstroke patterns. Each piece is unique.",
    tags: ["scarf", "silk", "brushstroke", "artistic", "luxury"],
    inStock: true,
    stockQuantity: 30,
    lowStockThreshold: 4,
    careInstructions: "Hand wash cold. Lay flat to dry.",
    style: "Luxury",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
].map(cloneProduct);

// Helper functions
export const getProductsByType = (type) => 
  products.filter(product => product.productType === type);

export const getFashionCatalogProducts = () =>
  products.filter((product) => product.productType === 'fashion');

export const getFashionCatalogProductsSnapshot = () =>
  getFashionCatalogProducts().map(cloneProduct);

export const hydrateFashionCatalogProducts = (nextProducts = []) => {
  const retainedProducts = products.filter((product) => product.productType !== 'fashion');
  const normalizedFashionProducts = Array.isArray(nextProducts)
    ? nextProducts
        .filter((product) => product?.productType === 'fashion')
        .map((product) => cloneProduct({
          ...product,
          frameColor: product.frameColor || 'N/A',
          updatedAt: product.updatedAt || new Date().toISOString()
        }))
    : [];

  products.splice(0, products.length, ...retainedProducts, ...normalizedFashionProducts);
  return getFashionCatalogProducts();
};

export const getArtworks = () => getProductsByType('artwork');
export const getFashionItems = () => getProductsByType('fashion');

export const getFeaturedProducts = () => 
  products.filter(product => product.isFeatured);

export const getNewProducts = () => 
  products.filter(product => product.isNew);

export const getBestsellers = () => 
  products.filter(product => product.isBestseller);

export const getProductById = (id) => 
  products.find(product => product.id === id);

export const getProductsByCategory = (category) => 
  products.filter(product => product.category === category);

export const getProductsByStyle = (style) => 
  products.filter(product => product.style === style);

export const searchProducts = (query) => {
  const lowercaseQuery = query.toLowerCase();
  return products.filter(product => 
    product.title.toLowerCase().includes(lowercaseQuery) ||
    product.artist.toLowerCase().includes(lowercaseQuery) ||
    product.description.toLowerCase().includes(lowercaseQuery) ||
    product.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

// Export for backward compatibility
export const artworks = getArtworks();
export { products as allProducts };
