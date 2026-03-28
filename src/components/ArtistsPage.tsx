const artists = [
  {
    name: "Layla Mansour",
    specialty: "Abstract & Expressionist",
    country: "Lebanon",
    works: 3,
    bio: "Layla's work explores the tension between chaos and order, using bold gesture painting to create emotionally resonant canvases that demand attention.",
    img: "https://images.unsplash.com/photo-1494790108755-2616b612b1e0?w=600&q=80",
    cover: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
  },
  {
    name: "Karim El-Rashid",
    specialty: "Abstract & Modern",
    country: "Egypt",
    works: 2,
    bio: "Drawing from Sufi traditions and contemporary minimalism, Karim creates meditative works that invite quiet contemplation in a fast-moving world.",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    cover: "https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=800&q=80",
  },
  {
    name: "Sara Al-Amiri",
    specialty: "Botanical & Landscape",
    country: "UAE",
    works: 2,
    bio: "Sara's intimate studies of desert flora challenge our perceptions of beauty in harsh environments, revealing extraordinary detail in overlooked corners of the natural world.",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80",
    cover: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
  },
  {
    name: "Nour Khalil",
    specialty: "Geometric & Contemporary",
    country: "Jordan",
    works: 2,
    bio: "Architecture and Islamic geometric traditions fuel Nour's work — precision studies that reveal the profound beauty embedded in mathematical form.",
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
    cover: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80",
  },
  {
    name: "Ahmed Farouk",
    specialty: "Landscape & Impressionist",
    country: "Egypt",
    works: 1,
    bio: "A plein-air painter who captures the shifting light of the Nile Delta, Ahmed's impressionist landscapes carry the scent of water and ancient earth.",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80",
    cover: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
  },
  {
    name: "Hana Osman",
    specialty: "Watercolor & Figurative",
    country: "Sudan",
    works: 2,
    bio: "Hana's delicate watercolor practice blends botanical illustration with abstract tenderness, creating works of extraordinary lightness and grace.",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80",
    cover: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
];

export default function ArtistsPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] pt-24">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <span
          className="text-[#c8a830] text-xs tracking-[0.4em]"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          THE CREATORS
        </span>
        <h1
          className="text-white text-5xl md:text-6xl font-light mt-3"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Our Artists
        </h1>
        <p
          className="text-white/40 mt-3 text-sm font-light max-w-md mx-auto tracking-wider"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Extraordinary talent from across the globe, united by a passion for their craft
        </p>
      </div>

      {/* Artists grid */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artists.map((artist) => (
            <div key={artist.name} className="group bg-white overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-500">
              {/* Cover image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={artist.cover}
                  alt={artist.name + " work"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div
                  className="absolute top-4 right-4 bg-[#c8a830] text-white text-[10px] tracking-[0.2em] px-3 py-1"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {artist.country}
                </div>
              </div>

              {/* Artist photo + info */}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#c8a830] shrink-0">
                    <img
                      src={artist.img}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3
                      className="text-[#0a0a0a] text-xl font-light"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {artist.name}
                    </h3>
                    <p
                      className="text-[#c8a830] text-[10px] tracking-[0.2em]"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {artist.specialty.toUpperCase()}
                    </p>
                  </div>
                </div>

                <p
                  className="text-gray-500 text-sm leading-relaxed font-light mb-4"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {artist.bio}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <span
                    className="text-gray-400 text-xs tracking-[0.15em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {artist.works} WORKS AVAILABLE
                  </span>
                  <button
                    className="text-[#0a0a0a] text-xs tracking-[0.15em] hover:text-[#c8a830] transition-colors flex items-center gap-2"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    VIEW WORKS
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#0a0a0a] py-16 text-center px-6">
        <h2
          className="text-white text-4xl font-light mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Are You an Artist?
        </h2>
        <p
          className="text-white/40 text-sm font-light mb-8 max-w-md mx-auto"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          We're always looking for exceptional talent to join the Sinipo family. Submit your portfolio for review.
        </p>
        <button
          className="border border-[#c8a830] text-[#c8a830] px-10 py-3 text-xs tracking-[0.3em] hover:bg-[#c8a830] hover:text-white transition-all duration-300"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          SUBMIT YOUR PORTFOLIO
        </button>
      </div>
    </div>
  );
}
