import fullLogo from "../../sinipo logo/Sinipo landscape-full.svg";

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const footerTargets: Record<string, string> = {
    "About Sinipo": "about",
    "Our Artists": "artists",
    "Journal": "blog",
    "Contact Us": "contact",
    "Size Guide": "shop",
    "My Account": "profile",
  };

  return (
    <footer className="bg-[#0a0a0a] text-white">
      {/* Main footer */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-5">
              <img
                src={fullLogo}
                alt="Sinipo full logo"
                className="h-auto w-full max-w-[260px] object-contain"
              />
            </div>
            <p
              className="text-white/40 text-sm leading-relaxed font-light max-w-xs"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              A premium art studio curating extraordinary framed artworks that connect collectors with the world's most compelling artists.
            </p>

            {/* Socials */}
            <div className="flex gap-4 mt-8">
              {["instagram", "pinterest", "facebook", "twitter"].map((social) => (
                <button
                  key={social}
                  className="w-9 h-9 border border-white/10 flex items-center justify-center text-white/40 hover:border-[#c8a830] hover:text-[#c8a830] transition-all duration-200"
                >
                  <span className="text-xs capitalize">{social[0].toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            {
              title: "Shop",
              links: ["Abstract Art", "Landscape Art", "Botanical Prints", "Geometric Art", "Figurative Works", "New Arrivals"],
            },
            {
              title: "Information",
              links: ["About Sinipo", "Our Artists", "Frame Options", "Journal", "Press & Media"],
            },
            {
              title: "Support",
              links: ["How to Order", "Shipping & Returns", "Care & Framing", "Size Guide", "My Account", "Contact Us"],
            },
          ].map((col) => (
            <div key={col.title}>
              <h3
                className="text-white text-xs tracking-[0.3em] mb-5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {col.title.toUpperCase()}
              </h3>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <button
                      onClick={() => onNavigate(footerTargets[link] || "shop")}
                      className="text-white/40 text-sm hover:text-[#c8a830] transition-colors font-light"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p
            className="text-white/25 text-xs tracking-wider"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            © 2025 Sinipo Art Studio. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((link) => (
              <button
                key={link}
                className="text-white/25 text-xs hover:text-white/50 transition-colors"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {link}
              </button>
            ))}
          </div>

          {/* Payment icons */}
          <div className="flex items-center gap-2">
            {["VISA", "MC", "AMEX", "PP"].map((p) => (
              <div
                key={p}
                className="px-2 py-1 border border-white/10 text-[8px] text-white/30 tracking-wider"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
