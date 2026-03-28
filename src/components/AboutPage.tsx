export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] pt-24">
      {/* Hero */}
      <div
        className="relative py-32 text-center overflow-hidden"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#0a0a0a]/80" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <span
            className="text-[#c8a830] text-xs tracking-[0.4em]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            OUR STORY
          </span>
          <h1
            className="text-white text-5xl md:text-7xl font-light mt-4 leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Sinipo Art Studio
          </h1>
          <p
            className="text-white/60 text-xl mt-4 italic font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Stronger Together
          </p>
        </div>
      </div>

      {/* Story section */}
      <div className="max-w-[900px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <span
              className="text-[#c8a830] text-xs tracking-[0.4em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              THE PHILOSOPHY
            </span>
            <h2
              className="text-4xl font-light text-[#0a0a0a] mt-3 mb-6 leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Art as the Thread That Binds Us
            </h2>
            <p
              className="text-gray-600 leading-relaxed font-light text-lg mb-5"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              The name Sinipo is derived from the ancient art of knotwork — the belief that true strength comes not from a single strand, but from many threads woven together. Just as our logo depicts three ropes intertwined, Sinipo represents the union of artist, collector, and story.
            </p>
            <p
              className="text-gray-500 leading-relaxed font-light"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px" }}
            >
              Founded with the vision to democratize access to museum-quality framed art, Sinipo bridges the gap between the world's most extraordinary artists and the collectors who appreciate their work.
            </p>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=700&q=80"
              alt="Art Studio"
              className="w-full aspect-[3/4] object-cover"
            />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 border-2 border-[#c8a830]" />
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              number: "01",
              title: "Curation",
              desc: "Our team of curators personally reviews hundreds of works each month, selecting only those that meet our exacting standards of artistic quality and emotional impact.",
            },
            {
              number: "02",
              title: "Craftsmanship",
              desc: "Every artwork is printed on archival-grade paper using museum-quality inks, then framed by master craftspeople using sustainably sourced hardwoods.",
            },
            {
              number: "03",
              title: "Community",
              desc: "We believe in supporting artists fairly. For every sale, the original artist receives a royalty, ensuring that creativity is valued and sustained.",
            },
          ].map((v) => (
            <div key={v.number} className="border-t-2 border-[#c8a830] pt-6">
              <div
                className="text-[#c8a830] text-4xl font-light mb-3"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {v.number}
              </div>
              <h3
                className="text-[#0a0a0a] text-xl font-light mb-3"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {v.title}
              </h3>
              <p
                className="text-gray-500 text-sm leading-relaxed"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {v.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Team */}
        <div className="text-center mb-12">
          <span
            className="text-[#c8a830] text-xs tracking-[0.4em]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            THE TEAM
          </span>
          <h2
            className="text-4xl font-light text-[#0a0a0a] mt-3"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            The People Behind Sinipo
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { name: "Ibrahim Al-Sinipo", role: "Founder & Creative Director", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
            { name: "Layla Mansour", role: "Head of Curation", img: "https://images.unsplash.com/photo-1494790108755-2616b612b1e0?w=400&q=80" },
            { name: "Karim El-Rashid", role: "Lead Artist Partner", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80" },
            { name: "Sara Al-Amiri", role: "Frame & Production", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80" },
          ].map((member) => (
            <div key={member.name} className="text-center">
              <div className="aspect-square overflow-hidden mb-3 border-4 border-gray-100">
                <img src={member.img} alt={member.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
              </div>
              <h4
                className="text-[#0a0a0a] text-sm font-light"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px" }}
              >
                {member.name}
              </h4>
              <p
                className="text-gray-400 text-[10px] tracking-wider mt-1"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {member.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
