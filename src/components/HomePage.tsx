import { useEffect, useState } from "react";
import Hero from "./Hero";
import { products as fallbackProducts } from "../data/products";
import ArtworkCard from "./ArtworkCard";
import type { Product } from "../data/products";
import { apiUrl } from "../lib/api";

interface HomePageProps {
  onNavigate: (page: string) => void;
  onAddToCart: (artwork: Product, quantity?: number, selectedFrame?: string) => void;
  onViewDetail: (artwork: Product) => void;
}

export default function HomePage({ onNavigate, onAddToCart, onViewDetail }: HomePageProps) {
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);
  const [homepageSettings, setHomepageSettings] = useState({
    showCategoryShowcase: true,
    showFeatured: true,
    showEditorial: true,
    showPromoGrid: true,
    showNewArrivals: true,
    showPromise: true,
    heroEyebrow: "PREMIUM ART STUDIO",
    heroLineOne: "Discover Art",
    heroLineTwo: "That Speaks",
    heroLineThree: "To Your Soul",
    heroBackgroundImage: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=1800&q=90",
    heroTagline:
      "Curated premium framed artworks by world-class artists. Each piece arrives ready to transform your space.",
    featuredHeading: "Featured Works",
    featuredEyebrow: "HANDPICKED",
    newArrivalsHeading: "New Arrivals",
    newArrivalsEyebrow: "JUST ARRIVED",
    editorialEyebrow: "OUR PHILOSOPHY",
    editorialHeading: "Art is the Knot That Binds Us Stronger Together",
    editorialBackgroundImage: "https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=1800&q=80",
    editorialBody:
      "At Sinipo, we believe every piece of art is a thread — connecting creator and collector, past and present, emotion and space. Our curated collection celebrates the beauty of human connection through extraordinary artworks.",
    promoEyebrow: "COLLECT WITH INTENTION",
    promoHeading: "Featured Moments Across The Store",
    promoBlocks: [
      {
        eyebrow: "NEW SEASON",
        title: "Gallery-ready drops for modern spaces",
        body: "Highlight your newest framed works, collectible fashion pieces, or category campaigns here.",
        image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
        ctaLabel: "Explore new arrivals",
        ctaPage: "shop",
      },
      {
        eyebrow: "EDITORIAL PICK",
        title: "Build a layered story through art and fashion",
        body: "Use this card for styling stories, limited edits, or a curated capsule you want customers to discover fast.",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80",
        ctaLabel: "Read the journal",
        ctaPage: "blog",
      },
      {
        eyebrow: "CURATOR NOTE",
        title: "Commission-worthy pieces with collectible detail",
        body: "Use the third promo to spotlight premium services, custom framing, or your highest-margin story.",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80",
        ctaLabel: "Meet the studio",
        ctaPage: "about",
      },
    ],
    promiseEyebrow: "THE SINIPO PROMISE",
    promiseHeading: "Why Collect With Us",
    promiseItems: [
      {
        title: "Curated Quality",
        description:
          "Every artwork is hand-selected by our curatorial team for exceptional quality and artistic merit.",
      },
      {
        title: "Premium Framing",
        description:
          "Museum-quality frames in 5 finishes, paired with archival matting and UV-protective glass.",
      },
      {
        title: "Ready to Hang",
        description:
          "Delivered professionally packaged, ready to hang — no visits to a framer required.",
      },
      {
        title: "Authenticity",
        description:
          "Each piece includes a certificate of authenticity and full provenance documentation.",
      },
    ],
  });

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const response = await fetch(apiUrl("/api/shopping/products"));
        const data = await response.json();

        if (!cancelled && response.ok && data.success && Array.isArray(data.data)) {
          setCatalog(data.data);
        }
      } catch (error) {
        console.error("Failed to load live catalog:", error);
      }
    };

    const loadStorefrontConfig = async () => {
      try {
        const response = await fetch(apiUrl("/api/shopping/config"));
        const data = await response.json();

        if (!cancelled && response.ok && data.success && data.data?.homepage) {
          setHomepageSettings((current) => ({
            ...current,
            ...data.data.homepage,
          }));
        }
      } catch (error) {
        console.error("Failed to load storefront settings:", error);
      }
    };

    void loadCatalog();
    void loadStorefrontConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = catalog.filter((product) => product.isFeatured).slice(0, 4);
  const newArrivals = catalog.filter((product) => product.isNew).slice(0, 3);

  return (
    <div>
      <Hero onNavigate={onNavigate} settings={homepageSettings} />

      {homepageSettings.showCategoryShowcase && (
      <section className="py-20 bg-[#fafaf8]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <span
              className="text-[#c8a830] text-xs tracking-[0.4em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              BROWSE BY STYLE
            </span>
            <h2
              className="text-4xl md:text-5xl font-light text-[#0a0a0a] mt-3"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Explore Our Collections
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Abstract", image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80", count: 6 },
              { name: "Landscape", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80", count: 2 },
              { name: "Botanical", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80", count: 2 },
              { name: "Geometric", image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80", count: 1 },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => onNavigate("shop")}
                className="relative overflow-hidden group aspect-[3/4]"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                  <h3
                    className="text-white text-2xl font-light"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {cat.name}
                  </h3>
                  <p
                    className="text-white/60 text-xs tracking-[0.2em] mt-1"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {cat.count} WORKS
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
      )}

      {homepageSettings.showFeatured && (
      <section className="py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span
                className="text-[#c8a830] text-xs tracking-[0.4em]"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {homepageSettings.featuredEyebrow}
              </span>
              <h2
                className="text-4xl md:text-5xl font-light text-[#0a0a0a] mt-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {homepageSettings.featuredHeading}
              </h2>
            </div>
            <button
              onClick={() => onNavigate("shop")}
              className="hidden md:flex items-center gap-2 text-sm text-[#0a0a0a] hover:text-[#c8a830] transition-colors tracking-[0.1em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              VIEW ALL
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14">
            {featured.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                onAddToCart={onAddToCart}
                onViewDetail={onViewDetail}
              />
            ))}
          </div>
        </div>
      </section>
      )}

      {homepageSettings.showEditorial && (
      <section
        className="relative py-32 overflow-hidden"
        style={{
          backgroundImage: `url('${homepageSettings.editorialBackgroundImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-[#0a0a0a]/75" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <span
            className="text-[#c8a830] text-xs tracking-[0.4em]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {homepageSettings.editorialEyebrow}
          </span>
          <h2
            className="text-white text-4xl md:text-6xl font-light mt-4 leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {homepageSettings.editorialHeading}
          </h2>
          <p
            className="text-white/60 mt-6 text-lg leading-relaxed font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {homepageSettings.editorialBody}
          </p>
          <button
            onClick={() => onNavigate("about")}
            className="mt-10 border border-[#c8a830] text-[#c8a830] px-10 py-4 text-xs tracking-[0.3em] hover:bg-[#c8a830] hover:text-white transition-all duration-300"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            READ OUR STORY
          </button>
        </div>
      </section>
      )}

      {homepageSettings.showPromoGrid && (
      <section className="py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-12">
            <span
              className="text-[#c8a830] text-xs tracking-[0.4em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {homepageSettings.promoEyebrow}
            </span>
            <h2
              className="text-4xl md:text-5xl font-light text-[#0a0a0a] mt-3"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {homepageSettings.promoHeading}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {homepageSettings.promoBlocks.map((block) => (
              <article key={`${block.title}-${block.ctaPage}`} className="group overflow-hidden border border-gray-100 bg-[#fafaf8]">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={block.image}
                    alt={block.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <p
                    className="text-[#c8a830] text-[10px] tracking-[0.25em] mb-2"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {block.eyebrow}
                  </p>
                  <h3
                    className="text-2xl font-light text-[#0a0a0a]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {block.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{block.body}</p>
                  <button
                    onClick={() => onNavigate(block.ctaPage)}
                    className="mt-5 text-xs tracking-[0.18em] text-[#0a0a0a] hover:text-[#c8a830] transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {block.ctaLabel.toUpperCase()}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      {homepageSettings.showNewArrivals && (
      <section className="py-20 bg-[#fafaf8]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span
                className="text-[#c8a830] text-xs tracking-[0.4em]"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {homepageSettings.newArrivalsEyebrow}
              </span>
              <h2
                className="text-4xl font-light text-[#0a0a0a] mt-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {homepageSettings.newArrivalsHeading}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-14">
            {newArrivals.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                onAddToCart={onAddToCart}
                onViewDetail={onViewDetail}
              />
            ))}
          </div>
        </div>
      </section>
      )}

      {homepageSettings.showPromise && (
      <section className="py-20 bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-16">
            <span
              className="text-[#c8a830] text-xs tracking-[0.4em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {homepageSettings.promiseEyebrow}
            </span>
            <h2
              className="text-white text-4xl font-light mt-3"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {homepageSettings.promiseHeading}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {homepageSettings.promiseItems.map((item, index) => (
              <div key={item.title} className="text-center group">
                <div className="text-[#c8a830] w-16 h-16 mx-auto mb-5 flex items-center justify-center border border-[#c8a830]/30 group-hover:border-[#c8a830] transition-colors duration-300">
                  <span
                    className="text-xl"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {index + 1}
                  </span>
                </div>
                <h3
                  className="text-white text-xl font-light mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-white/40 text-sm leading-relaxed font-light"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-14">
            <span
              className="text-[#c8a830] text-xs tracking-[0.4em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              CLIENT STORIES
            </span>
            <h2
              className="text-4xl font-light text-[#0a0a0a] mt-3"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              What Collectors Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "The artwork arrived perfectly packaged and the gold frame is absolutely stunning. It transformed my living room completely.",
                author: "Amira Hassan",
                location: "Dubai, UAE",
              },
              {
                quote: "Sinipo's curation is extraordinary. Every piece feels carefully chosen. I've now purchased three works and each one is exceptional.",
                author: "James Whitfield",
                location: "London, UK",
              },
              {
                quote: "The certificate of authenticity and the care they put into presentation shows this isn't just a shop — it's a true art gallery.",
                author: "Sofia Mendes",
                location: "São Paulo, Brazil",
              },
            ].map((t) => (
              <div key={t.author} className="bg-[#fafaf8] p-8 border border-gray-100">
                <div className="text-[#c8a830] text-4xl mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>"</div>
                <p
                  className="text-gray-600 text-lg leading-relaxed font-light italic"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t.quote}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-8 h-px bg-[#c8a830]" />
                  <div>
                    <div
                      className="text-sm font-medium text-[#0a0a0a]"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {t.author}
                    </div>
                    <div
                      className="text-xs text-gray-400"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {t.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-[#fafaf8] border-t border-gray-100">
        <div className="max-w-xl mx-auto px-6 text-center">
          <span
            className="text-[#c8a830] text-xs tracking-[0.4em]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            JOIN THE COMMUNITY
          </span>
          <h2
            className="text-4xl font-light text-[#0a0a0a] mt-3 mb-4"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Collect with Purpose
          </h2>
          <p
            className="text-gray-500 text-sm mb-8 font-light"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Be first to discover new arrivals, exclusive collections, and private sale events.
          </p>
          <div className="flex gap-0">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-5 py-3 border border-gray-200 text-sm outline-none focus:border-[#c8a830] bg-white transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            />
            <button
              className="bg-[#0a0a0a] text-white px-6 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors duration-300 shrink-0"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              SUBSCRIBE
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
