import { getPublishedBlogPostsData } from './admin/blogController.js';
import { findCatalogProductById, getCatalogProductsData } from '../utils/catalog.js';
import { getSeoSettings, getShippingSettings } from '../config/storefront.js';

// Generate sitemap XML
export const generateSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/shop</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/artists</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Product Pages -->
`;

    const products = getCatalogProductsData();
    const blogPosts = getPublishedBlogPostsData();

    // Add product pages
    products.forEach(product => {
      const productSlug = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      sitemap += `
  <url>
    <loc>${baseUrl}/product/${product.id}/${productSlug}</loc>
    <lastmod>${product.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${product.image}</image:loc>
      <image:title>${product.title}</image:title>
      <image:caption>${product.description}</image:caption>
    </image:image>
  </url>`;
    });

    // Add blog posts
    blogPosts.forEach(post => {
      sitemap += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${post.featuredImage}</image:loc>
      <image:title>${post.title}</image:title>
      <image:caption>${post.excerpt}</image:caption>
    </image:image>
  </url>`;
    });

    sitemap += `
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('Generate sitemap error:', error);
    res.status(500).json({
      error: 'Failed to generate sitemap',
      message: error.message
    });
  }
};

// Generate robots.txt
export const generateRobotsTxt = async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private areas
Disallow: /admin
Disallow: /api
Disallow: /profile
Disallow: /checkout

# Allow search engines to crawl product and blog pages
Allow: /shop
Allow: /product
Allow: /blog
Allow: /artists
Allow: /about

# Crawl-delay for politeness
Crawl-delay: 1`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(robotsTxt);

  } catch (error) {
    console.error('Generate robots.txt error:', error);
    res.status(500).json({
      error: 'Failed to generate robots.txt',
      message: error.message
    });
  }
};

// Get meta tags for a specific page
export const getMetaTags = async (req, res) => {
  try {
    const { page, id, slug } = req.query;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const seoSettings = getSeoSettings();
    
    let metaTags = {
      title: seoSettings.defaultTitle,
      description: seoSettings.defaultDescription,
      keywords: seoSettings.defaultKeywords,
      image: seoSettings.defaultImage,
      url: baseUrl,
      type: "website",
      siteName: seoSettings.siteName,
      locale: seoSettings.locale
    };

    switch (page) {
      case 'product':
        if (id) {
          const product = findCatalogProductById(id);
          if (product) {
            metaTags = {
              ...metaTags,
              title: `${product.title} by ${product.artist} | ${seoSettings.siteName}`,
              description: `${product.description} - ${product.category} ${product.style} ${product.productType}. Premium quality with worldwide shipping.`,
              keywords: `${product.tags.join(', ')}, ${product.category}, ${product.style}, ${product.artist}, art, fashion`,
              image: product.image,
              url: `${baseUrl}/product/${product.id}`,
              type: "product"
            };
          }
        }
        break;

      case 'blog':
        if (slug) {
          // In production, fetch from database
          metaTags = {
            ...metaTags,
            title: `Art Blog | ${seoSettings.siteName}`,
            description: "Discover art tips, collection guides, and stories behind our curated pieces.",
            url: `${baseUrl}/blog/${slug}`,
            type: "article"
          };
        }
        break;

      case 'shop':
        metaTags = {
          ...metaTags,
          title: `Shop Art & Fashion | ${seoSettings.siteName}`,
          description: "Browse our curated collection of premium artworks and fashion pieces. Abstract, landscape, botanical, and more.",
          url: `${baseUrl}/shop`,
          type: "website"
        };
        break;

      case 'about':
        metaTags = {
          ...metaTags,
          title: `About Us | ${seoSettings.siteName}`,
          description: "Learn about Sinipo Art Studio - where art meets fashion. Our story, mission, and commitment to quality.",
          url: `${baseUrl}/about`
        };
        break;
    }

    res.json({
      success: true,
      data: metaTags
    });

  } catch (error) {
    console.error('Get meta tags error:', error);
    res.status(500).json({
      error: 'Failed to get meta tags',
      message: error.message
    });
  }
};

// Generate schema markup for products
export const getProductSchema = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shippingSettings = getShippingSettings();
    
    const product = findCatalogProductById(id);
    
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title,
      "description": product.description,
      "image": product.image,
      "sku": `SIN-${product.id.toString().padStart(3, '0')}`,
      "brand": {
        "@type": "Brand",
        "name": product.artist
      },
      "category": product.category,
      "material": product.material || "Premium Materials",
      "color": product.color || product.frameColor,
      "size": product.size,
      "offers": {
        "@type": "Offer",
        "url": `${baseUrl}/product/${product.id}`,
        "priceCurrency": shippingSettings.currency,
        "price": product.price,
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {
          "@type": "Organization",
          "name": "Sinipo Art Studio"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "127",
        "bestRating": "5",
        "worstRating": "1"
      }
    };

    // Add original price if on sale
    if (product.originalPrice) {
      schema.offers.highPrice = product.originalPrice;
      schema.offers.lowPrice = product.price;
    }

    res.json({
      success: true,
      data: schema
    });

  } catch (error) {
    console.error('Get product schema error:', error);
    res.status(500).json({
      error: 'Failed to get product schema',
      message: error.message
    });
  }
};

// Generate organization schema
export const getOrganizationSchema = async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const seoSettings = getSeoSettings();
    
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": seoSettings.organizationName,
      "alternateName": "Sinipo Studio",
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`,
      "description": seoSettings.defaultDescription,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": seoSettings.organizationCountry,
        "addressLocality": seoSettings.organizationCity
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": seoSettings.organizationPhone,
        "contactType": "customer service",
        "email": seoSettings.organizationEmail
      },
      "sameAs": [
        "https://instagram.com/sinipo.art",
        "https://facebook.com/sinipo.art",
        "https://pinterest.com/sinipo.art"
      ],
      "founder": {
        "@type": "Person",
        "name": "Sinipo Team"
      },
      "foundingDate": "2024",
      "numberOfEmployees": {
        "@type": "QuantitativeValue",
        "value": "10"
      },
      "slogan": seoSettings.slogan
    };

    res.json({
      success: true,
      data: schema
    });

  } catch (error) {
    console.error('Get organization schema error:', error);
    res.status(500).json({
      error: 'Failed to get organization schema',
      message: error.message
    });
  }
};

// Get breadcrumb schema
export const getBreadcrumbSchema = async (req, res) => {
  try {
    const { page, category } = req.query;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    let breadcrumbs = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      }
    ];

    switch (page) {
      case 'shop':
        breadcrumbs.push({
          "@type": "ListItem",
          "position": 2,
          "name": "Shop",
          "item": `${baseUrl}/shop`
        });
        if (category) {
          breadcrumbs.push({
            "@type": "ListItem",
            "position": 3,
            "name": category,
            "item": `${baseUrl}/shop?category=${category}`
          });
        }
        break;

      case 'product':
        breadcrumbs.push({
          "@type": "ListItem",
          "position": 2,
          "name": "Shop",
          "item": `${baseUrl}/shop`
        });
        break;

      case 'blog':
        breadcrumbs.push({
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": `${baseUrl}/blog`
        });
        break;
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs
    };

    res.json({
      success: true,
      data: schema
    });

  } catch (error) {
    console.error('Get breadcrumb schema error:', error);
    res.status(500).json({
      error: 'Failed to get breadcrumb schema',
      message: error.message
    });
  }
};

// Get website schema
export const getWebsiteSchema = async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const seoSettings = getSeoSettings();
    
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": seoSettings.siteName,
      "url": baseUrl,
      "description": seoSettings.defaultDescription,
      "publisher": {
        "@type": "Organization",
        "name": seoSettings.organizationName
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/shop?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    res.json({
      success: true,
      data: schema
    });

  } catch (error) {
    console.error('Get website schema error:', error);
    res.status(500).json({
      error: 'Failed to get website schema',
      message: error.message
    });
  }
};

// Generate all schemas for a page
export const getPageSchemas = async (req, res) => {
  try {
    const { page, id } = req.query;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const seoSettings = getSeoSettings();
    const shippingSettings = getShippingSettings();
    
    const schemas = [];

    // Always include organization schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": seoSettings.organizationName,
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`
    });

    // Add page-specific schemas
    if (page === 'product' && id) {
      const product = findCatalogProductById(id);
      if (product) {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.title,
          "image": product.image,
          "description": product.description,
          "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": shippingSettings.currency,
            "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        });
      }
    }

    if (page === 'shop') {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": `${seoSettings.siteName} Shop`,
        "description": seoSettings.defaultDescription
      });
    }

    if (page === 'blog') {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": `${seoSettings.siteName} Journal`,
        "description": seoSettings.defaultDescription,
        "publisher": {
          "@type": "Organization",
          "name": seoSettings.organizationName
        }
      });
    }

    res.json({
      success: true,
      data: schemas
    });

  } catch (error) {
    console.error('Get page schemas error:', error);
    res.status(500).json({
      error: 'Failed to get page schemas',
      message: error.message
    });
  }
};
