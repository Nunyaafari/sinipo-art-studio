interface HeroProps {
  onNavigate: (page: string) => void;
  settings?: {
    heroEyebrow: string;
    heroLineOne: string;
    heroLineTwo: string;
    heroLineThree: string;
    heroTagline: string;
    heroBackgroundImage?: string;
  };
}

export default function Hero({ onNavigate, settings }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${settings?.heroBackgroundImage || "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=1800&q=90"}')`,
        }}
      />
      {/* Dark overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />

      {/* Decorative line elements */}
      <div className="absolute top-1/4 left-10 w-px h-32 bg-[#c8a830]/40" />
      <div className="absolute bottom-1/4 right-10 w-px h-32 bg-[#c8a830]/40" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-3 mb-8 text-[#c8a830] text-xs tracking-[0.4em] font-light"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span className="w-8 h-px bg-[#c8a830]" />
          {settings?.heroEyebrow || "PREMIUM ART STUDIO"}
          <span className="w-8 h-px bg-[#c8a830]" />
        </div>

        {/* Main headline */}
        <h1
          className="text-white mb-6 leading-none"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          <span className="block text-6xl md:text-8xl font-light italic">{settings?.heroLineOne || "Discover Art"}</span>
          <span className="block text-6xl md:text-8xl font-light mt-1">{settings?.heroLineTwo || "That Speaks"}</span>
          <span className="block text-6xl md:text-8xl font-light italic text-[#c8a830]">{settings?.heroLineThree || "To Your Soul"}</span>
        </h1>

        {/* Tagline */}
        <p
          className="text-white/70 text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {settings?.heroTagline || "Curated premium framed artworks by world-class artists. Each piece arrives ready to transform your space."}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate("shop")}
            className="group relative overflow-hidden bg-[#c8a830] text-white px-10 py-4 text-sm tracking-[0.2em] font-medium transition-all duration-300 hover:bg-[#b8972a]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span className="relative z-10">EXPLORE COLLECTION</span>
          </button>
          <button
            onClick={() => onNavigate("about")}
            className="group border border-white/50 text-white px-10 py-4 text-sm tracking-[0.2em] font-light transition-all duration-300 hover:bg-white/10 hover:border-white"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            OUR STORY
          </button>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto">
          {[
            { number: "500+", label: "Artworks" },
            { number: "120+", label: "Artists" },
            { number: "50+", label: "Countries" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-3xl text-white font-light"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {stat.number}
              </div>
              <div
                className="text-white/50 text-xs tracking-[0.2em] mt-1"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {stat.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div
          className="text-white/40 text-xs tracking-[0.3em]"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          SCROLL
        </div>
        <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
