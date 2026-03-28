const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value, fallback) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  return fallback;
};

const asString = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const sanitizePromoBlocks = (value, fallback) => {
  const source = Array.isArray(value) ? value : fallback;

  return source.slice(0, 3).map((item, index) => ({
    eyebrow: asString(item?.eyebrow, fallback[index]?.eyebrow || `PROMO ${index + 1}`),
    title: asString(item?.title, fallback[index]?.title || `Promo Block ${index + 1}`),
    body: asString(item?.body, fallback[index]?.body || 'Add promotional copy for this card.'),
    image: asString(item?.image, fallback[index]?.image || ''),
    ctaLabel: asString(item?.ctaLabel, fallback[index]?.ctaLabel || 'Shop now'),
    ctaPage: asString(item?.ctaPage, fallback[index]?.ctaPage || 'shop')
  }));
};

const sanitizePromiseItems = (value, fallback) => {
  const source = Array.isArray(value) ? value : fallback;

  return source.slice(0, 4).map((item, index) => ({
    title: asString(item?.title, fallback[index]?.title || `Promise ${index + 1}`),
    description: asString(
      item?.description,
      fallback[index]?.description || 'Add the supporting promise copy for this item.'
    )
  }));
};

export const createDefaultStorefrontSettings = () => ({
  shipping: {
    currency: process.env.STORE_CURRENCY || 'USD',
    freeShippingThreshold: asNumber(process.env.FREE_SHIPPING_THRESHOLD, 500),
    standardShippingCost: asNumber(process.env.STANDARD_SHIPPING_COST, 50),
    shippingLabel: process.env.SHIPPING_LABEL || 'Standard delivery',
    estimatedDelivery: process.env.ESTIMATED_DELIVERY || '3-5 business days'
  },
  tax: {
    enabled: asBoolean(process.env.TAX_ENABLED, false),
    taxRate: asNumber(process.env.TAX_RATE, 0),
    taxLabel: process.env.TAX_LABEL || 'Sales tax'
  },
  payment: {
    paymentMode: process.env.PAYMENT_MODE === 'test' ? 'test' : 'live',
    providerName: process.env.PAYMENT_PROVIDER_NAME || 'Paystack',
    guestCheckoutEnabled: asBoolean(process.env.GUEST_CHECKOUT_ENABLED, true),
    livePublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    liveSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
    testPublicKey: process.env.PAYSTACK_TEST_PUBLIC_KEY || '',
    testSecretKey: process.env.PAYSTACK_TEST_SECRET_KEY || '',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
    checkoutNotice:
      process.env.CHECKOUT_NOTICE ||
      'All payments are securely processed and confirmed before fulfillment begins.'
  },
  email: {
    providerName: process.env.EMAIL_PROVIDER_NAME || 'SMTP',
    fromName: process.env.EMAIL_FROM_NAME || 'Sinipo Art Studio',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'hello@sinipo.art',
    replyToAddress: process.env.EMAIL_REPLY_TO_ADDRESS || process.env.SMTP_USER || 'hello@sinipo.art',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: asNumber(process.env.SMTP_PORT, 587),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    secure: asBoolean(process.env.SMTP_SECURE, false),
    orderConfirmationEnabled: asBoolean(process.env.EMAIL_ORDER_CONFIRMATION_ENABLED, true),
    shippingUpdateEnabled: asBoolean(process.env.EMAIL_SHIPPING_UPDATE_ENABLED, true),
    newsletterEnabled: asBoolean(process.env.EMAIL_NEWSLETTER_ENABLED, true)
  },
  inventory: {
    lowStockThreshold: asNumber(process.env.LOW_STOCK_THRESHOLD, 3)
  },
  homepage: {
    showCategoryShowcase: true,
    showFeatured: true,
    showEditorial: true,
    showPromoGrid: true,
    showNewArrivals: true,
    showPromise: true,
    heroEyebrow: 'PREMIUM ART STUDIO',
    heroLineOne: 'Discover Art',
    heroLineTwo: 'That Speaks',
    heroLineThree: 'To Your Soul',
    heroBackgroundImage: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=1800&q=90',
    heroTagline:
      'Curated premium framed artworks by world-class artists. Each piece arrives ready to transform your space.',
    featuredHeading: 'Featured Works',
    featuredEyebrow: 'HANDPICKED',
    newArrivalsHeading: 'New Arrivals',
    newArrivalsEyebrow: 'JUST ARRIVED',
    editorialEyebrow: 'OUR PHILOSOPHY',
    editorialHeading: 'Art is the Knot That Binds Us Stronger Together',
    editorialBackgroundImage: 'https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=1800&q=80',
    editorialBody:
      'At Sinipo, we believe every piece of art is a thread — connecting creator and collector, past and present, emotion and space. Our curated collection celebrates the beauty of human connection through extraordinary artworks.',
    promoEyebrow: 'COLLECT WITH INTENTION',
    promoHeading: 'Featured Moments Across The Store',
    promoBlocks: [
      {
        eyebrow: 'NEW SEASON',
        title: 'Gallery-ready drops for modern spaces',
        body: 'Highlight your newest framed works, collectible fashion pieces, or category campaigns here.',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
        ctaLabel: 'Explore new arrivals',
        ctaPage: 'shop'
      },
      {
        eyebrow: 'EDITORIAL PICK',
        title: 'Build a layered story through art and fashion',
        body: 'Use this card for styling stories, limited edits, or a curated capsule you want customers to discover fast.',
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80',
        ctaLabel: 'Read the journal',
        ctaPage: 'blog'
      },
      {
        eyebrow: 'CURATOR NOTE',
        title: 'Commission-worthy pieces with collectible detail',
        body: 'Use the third promo to spotlight premium services, custom framing, or your highest-margin story.',
        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80',
        ctaLabel: 'Meet the studio',
        ctaPage: 'about'
      }
    ],
    promiseEyebrow: 'THE SINIPO PROMISE',
    promiseHeading: 'Why Collect With Us',
    promiseItems: [
      {
        title: 'Curated Quality',
        description:
          'Every artwork is hand-selected by our curatorial team for exceptional quality and artistic merit.'
      },
      {
        title: 'Premium Framing',
        description:
          'Museum-quality frames in 5 finishes, paired with archival matting and UV-protective glass.'
      },
      {
        title: 'Ready to Hang',
        description:
          'Delivered professionally packaged, ready to hang with no visit to a framer required.'
      },
      {
        title: 'Authenticity',
        description:
          'Each piece includes a certificate of authenticity and full provenance documentation.'
      }
    ]
  },
  seo: {
    siteName: 'Sinipo Art Studio',
    defaultTitle: 'Sinipo Art Studio - Premium Art & Fashion',
    defaultDescription:
      'Discover stunning artworks and fashion pieces at Sinipo Art Studio. Premium quality, curated collections, worldwide shipping.',
    defaultKeywords:
      'art, fashion, premium, gallery, contemporary, modern, abstract, paintings, designer clothing',
    defaultImage: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&q=80',
    locale: 'en_US',
    organizationName: 'Sinipo Art Studio',
    organizationEmail: 'hello@sinipo.art',
    organizationPhone: '+234-800-000-0000',
    organizationCountry: 'NG',
    organizationCity: 'Lagos',
    slogan: 'Where Art Meets Fashion'
  }
});

export const sanitizeStorefrontSettings = (input = {}) => {
  const defaults = createDefaultStorefrontSettings();
  const source = input && typeof input === 'object' ? input : {};

  return {
    shipping: {
      currency: asString(source.shipping?.currency, defaults.shipping.currency),
      freeShippingThreshold: Math.max(0, asNumber(source.shipping?.freeShippingThreshold, defaults.shipping.freeShippingThreshold)),
      standardShippingCost: Math.max(0, asNumber(source.shipping?.standardShippingCost, defaults.shipping.standardShippingCost)),
      shippingLabel: asString(source.shipping?.shippingLabel, defaults.shipping.shippingLabel),
      estimatedDelivery: asString(source.shipping?.estimatedDelivery, defaults.shipping.estimatedDelivery)
    },
    tax: {
      enabled: asBoolean(source.tax?.enabled, defaults.tax.enabled),
      taxRate: Math.max(0, asNumber(source.tax?.taxRate, defaults.tax.taxRate)),
      taxLabel: asString(source.tax?.taxLabel, defaults.tax.taxLabel)
    },
    payment: {
      paymentMode: source.payment?.paymentMode === 'test' ? 'test' : 'live',
      providerName: asString(source.payment?.providerName, defaults.payment.providerName),
      guestCheckoutEnabled: asBoolean(source.payment?.guestCheckoutEnabled, defaults.payment.guestCheckoutEnabled),
      livePublicKey: asString(source.payment?.livePublicKey, defaults.payment.livePublicKey),
      liveSecretKey: asString(source.payment?.liveSecretKey, defaults.payment.liveSecretKey),
      testPublicKey: asString(source.payment?.testPublicKey, defaults.payment.testPublicKey),
      testSecretKey: asString(source.payment?.testSecretKey, defaults.payment.testSecretKey),
      webhookSecret: asString(source.payment?.webhookSecret, defaults.payment.webhookSecret),
      checkoutNotice: asString(source.payment?.checkoutNotice, defaults.payment.checkoutNotice)
    },
    email: {
      providerName: asString(source.email?.providerName, defaults.email.providerName),
      fromName: asString(source.email?.fromName, defaults.email.fromName),
      fromAddress: asString(source.email?.fromAddress, defaults.email.fromAddress),
      replyToAddress: asString(source.email?.replyToAddress, defaults.email.replyToAddress),
      smtpHost: asString(source.email?.smtpHost, defaults.email.smtpHost),
      smtpPort: Math.max(1, asNumber(source.email?.smtpPort, defaults.email.smtpPort)),
      smtpUser: asString(source.email?.smtpUser, defaults.email.smtpUser),
      smtpPass: asString(source.email?.smtpPass, defaults.email.smtpPass),
      secure: asBoolean(source.email?.secure, defaults.email.secure),
      orderConfirmationEnabled: asBoolean(
        source.email?.orderConfirmationEnabled,
        defaults.email.orderConfirmationEnabled
      ),
      shippingUpdateEnabled: asBoolean(
        source.email?.shippingUpdateEnabled,
        defaults.email.shippingUpdateEnabled
      ),
      newsletterEnabled: asBoolean(source.email?.newsletterEnabled, defaults.email.newsletterEnabled)
    },
    inventory: {
      lowStockThreshold: Math.max(
        1,
        asNumber(source.inventory?.lowStockThreshold, defaults.inventory.lowStockThreshold)
      )
    },
    homepage: {
      showCategoryShowcase: asBoolean(source.homepage?.showCategoryShowcase, defaults.homepage.showCategoryShowcase),
      showFeatured: asBoolean(source.homepage?.showFeatured, defaults.homepage.showFeatured),
      showEditorial: asBoolean(source.homepage?.showEditorial, defaults.homepage.showEditorial),
      showPromoGrid: asBoolean(source.homepage?.showPromoGrid, defaults.homepage.showPromoGrid),
      showNewArrivals: asBoolean(source.homepage?.showNewArrivals, defaults.homepage.showNewArrivals),
      showPromise: asBoolean(source.homepage?.showPromise, defaults.homepage.showPromise),
      heroEyebrow: asString(source.homepage?.heroEyebrow, defaults.homepage.heroEyebrow),
      heroLineOne: asString(source.homepage?.heroLineOne, defaults.homepage.heroLineOne),
      heroLineTwo: asString(source.homepage?.heroLineTwo, defaults.homepage.heroLineTwo),
      heroLineThree: asString(source.homepage?.heroLineThree, defaults.homepage.heroLineThree),
      heroBackgroundImage: asString(
        source.homepage?.heroBackgroundImage,
        defaults.homepage.heroBackgroundImage
      ),
      heroTagline: asString(source.homepage?.heroTagline, defaults.homepage.heroTagline),
      featuredHeading: asString(source.homepage?.featuredHeading, defaults.homepage.featuredHeading),
      featuredEyebrow: asString(source.homepage?.featuredEyebrow, defaults.homepage.featuredEyebrow),
      newArrivalsHeading: asString(source.homepage?.newArrivalsHeading, defaults.homepage.newArrivalsHeading),
      newArrivalsEyebrow: asString(source.homepage?.newArrivalsEyebrow, defaults.homepage.newArrivalsEyebrow),
      editorialEyebrow: asString(source.homepage?.editorialEyebrow, defaults.homepage.editorialEyebrow),
      editorialHeading: asString(source.homepage?.editorialHeading, defaults.homepage.editorialHeading),
      editorialBackgroundImage: asString(
        source.homepage?.editorialBackgroundImage,
        defaults.homepage.editorialBackgroundImage
      ),
      editorialBody: asString(source.homepage?.editorialBody, defaults.homepage.editorialBody),
      promoEyebrow: asString(source.homepage?.promoEyebrow, defaults.homepage.promoEyebrow),
      promoHeading: asString(source.homepage?.promoHeading, defaults.homepage.promoHeading),
      promoBlocks: sanitizePromoBlocks(source.homepage?.promoBlocks, defaults.homepage.promoBlocks),
      promiseEyebrow: asString(source.homepage?.promiseEyebrow, defaults.homepage.promiseEyebrow),
      promiseHeading: asString(source.homepage?.promiseHeading, defaults.homepage.promiseHeading),
      promiseItems: sanitizePromiseItems(source.homepage?.promiseItems, defaults.homepage.promiseItems)
    },
    seo: {
      siteName: asString(source.seo?.siteName, defaults.seo.siteName),
      defaultTitle: asString(source.seo?.defaultTitle, defaults.seo.defaultTitle),
      defaultDescription: asString(source.seo?.defaultDescription, defaults.seo.defaultDescription),
      defaultKeywords: asString(source.seo?.defaultKeywords, defaults.seo.defaultKeywords),
      defaultImage: asString(source.seo?.defaultImage, defaults.seo.defaultImage),
      locale: asString(source.seo?.locale, defaults.seo.locale),
      organizationName: asString(source.seo?.organizationName, defaults.seo.organizationName),
      organizationEmail: asString(source.seo?.organizationEmail, defaults.seo.organizationEmail),
      organizationPhone: asString(source.seo?.organizationPhone, defaults.seo.organizationPhone),
      organizationCountry: asString(source.seo?.organizationCountry, defaults.seo.organizationCountry),
      organizationCity: asString(source.seo?.organizationCity, defaults.seo.organizationCity),
      slogan: asString(source.seo?.slogan, defaults.seo.slogan)
    }
  };
};
