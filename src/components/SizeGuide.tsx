import { useState } from "react";

interface SizeGuideProps {
  isOpen: boolean;
  onClose: () => void;
  productType: "artwork" | "fashion";
}

export default function SizeGuide({ isOpen, onClose, productType }: SizeGuideProps) {
  const [activeTab, setActiveTab] = useState<"sizes" | "frames" | "room">("sizes");

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2
              className="text-2xl font-light text-[#0a0a0a]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Size Guide & Visualization
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-[#0a0a0a] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { id: "sizes", label: "SIZE GUIDE" },
              { id: "frames", label: "FRAME VISUALIZER" },
              { id: "room", label: "ROOM PREVIEW" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 text-xs tracking-[0.2em] transition-all ${
                  activeTab === tab.id
                    ? "bg-[#0a0a0a] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === "sizes" && (
              <div>
                {productType === "artwork" ? (
                  /* Artwork Sizes */
                  <div>
                    <h3
                      className="text-xl font-light text-[#0a0a0a] mb-6"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Artwork Size Guide
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          STANDARD SIZES
                        </h4>
                        <div className="space-y-3">
                          {[
                            { size: "Small", dimensions: "40 × 50 cm", desc: "Perfect for intimate spaces" },
                            { size: "Medium", dimensions: "60 × 80 cm", desc: "Versatile for most rooms" },
                            { size: "Large", dimensions: "80 × 100 cm", desc: "Statement piece for living areas" },
                            { size: "XLarge", dimensions: "100 × 120 cm", desc: "Grand centerpiece artwork" }
                          ].map((item) => (
                            <div key={item.size} className="flex items-center justify-between p-3 border border-gray-100">
                              <div>
                                <span className="text-sm font-medium text-[#0a0a0a]">{item.size}</span>
                                <p className="text-xs text-gray-400">{item.desc}</p>
                              </div>
                              <span className="text-sm text-gray-600">{item.dimensions}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          ROOM RECOMMENDATIONS
                        </h4>
                        <div className="space-y-3">
                          {[
                            { room: "Bedroom", size: "Small to Medium", wall: "Above bed or dresser" },
                            { room: "Living Room", size: "Large to XLarge", wall: "Main focal wall" },
                            { room: "Dining Room", size: "Medium to Large", wall: "Above sideboard" },
                            { room: "Office", size: "Small to Medium", wall: "Behind desk or seating" }
                          ].map((item) => (
                            <div key={item.room} className="p-3 border border-gray-100">
                              <span className="text-sm font-medium text-[#0a0a0a]">{item.room}</span>
                              <p className="text-xs text-gray-400 mt-1">
                                Recommended: {item.size} • Best placement: {item.wall}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Fashion Sizes */
                  <div>
                    <h3
                      className="text-xl font-light text-[#0a0a0a] mb-6"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Fashion Size Guide
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>SIZE</th>
                            <th className="text-left py-3 text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>BUST</th>
                            <th className="text-left py-3 text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>WAIST</th>
                            <th className="text-left py-3 text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>HIPS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { size: "XS", bust: "81-84", waist: "61-64", hips: "86-89" },
                            { size: "S", bust: "86-89", waist: "66-69", hips: "91-94" },
                            { size: "M", bust: "91-94", waist: "71-74", hips: "96-99" },
                            { size: "L", bust: "96-99", waist: "76-79", hips: "101-104" },
                            { size: "XL", bust: "101-104", waist: "81-84", hips: "106-109" }
                          ].map((row) => (
                            <tr key={row.size} className="border-b border-gray-100">
                              <td className="py-3 text-sm font-medium">{row.size}</td>
                              <td className="py-3 text-sm text-gray-600">{row.bust} cm</td>
                              <td className="py-3 text-sm text-gray-600">{row.waist} cm</td>
                              <td className="py-3 text-sm text-gray-600">{row.hips} cm</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      * Measurements are in centimeters. For best fit, measure yourself and compare with the chart above.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "frames" && (
              <div>
                <h3
                  className="text-xl font-light text-[#0a0a0a] mb-6"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Frame Visualizer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      FRAME OPTIONS
                    </h4>
                    <div className="space-y-4">
                      {[
                        { name: "Gold", color: "#c8a830", desc: "Classic elegance, perfect for traditional spaces" },
                        { name: "Black", color: "#1a1a1a", desc: "Modern sophistication, versatile for any decor" },
                        { name: "Silver", color: "#b0b0b0", desc: "Contemporary sleekness, ideal for modern interiors" },
                        { name: "White", color: "#e0e0e0", desc: "Clean minimalism, great for bright spaces" },
                        { name: "Walnut", color: "#5c3d2e", desc: "Warm naturalness, perfect for cozy environments" }
                      ].map((frame) => (
                        <div key={frame.name} className="flex items-center gap-4 p-4 border border-gray-100">
                          <div
                            className="w-12 h-12 rounded-sm border-2"
                            style={{ backgroundColor: frame.color }}
                          />
                          <div>
                            <span className="text-sm font-medium text-[#0a0a0a]">{frame.name}</span>
                            <p className="text-xs text-gray-400">{frame.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      FRAME SPECS
                    </h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50">
                        <span className="text-sm font-medium text-[#0a0a0a]">Premium Hardwood</span>
                        <p className="text-xs text-gray-400 mt-1">
                          All frames are crafted from premium hardwood for durability and elegance.
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50">
                        <span className="text-sm font-medium text-[#0a0a0a]">UV-Protective Glass</span>
                        <p className="text-xs text-gray-400 mt-1">
                          Museum-quality glass protects your artwork from fading and damage.
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50">
                        <span className="text-sm font-medium text-[#0a0a0a]">Archival Matting</span>
                        <p className="text-xs text-gray-400 mt-1">
                          Acid-free matting ensures long-term preservation of your artwork.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "room" && (
              <div>
                <h3
                  className="text-xl font-light text-[#0a0a0a] mb-6"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Virtual Room Preview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      VISUALIZATION TIPS
                    </h4>
                    <div className="space-y-4">
                      <div className="p-4 border border-gray-100">
                        <span className="text-sm font-medium text-[#0a0a0a]">Wall Color</span>
                        <p className="text-xs text-gray-400 mt-1">
                          Consider your wall color when choosing artwork. Light walls work with bold pieces, while dark walls benefit from lighter artwork.
                        </p>
                      </div>
                      <div className="p-4 border border-gray-100">
                        <span className="text-sm font-medium text-[#0a0a0a]">Lighting</span>
                        <p className="text-xs text-gray-400 mt-1">
                          Natural light enhances colors, while artificial lighting can change how artwork appears. Consider your room's lighting conditions.
                        </p>
                      </div>
                      <div className="p-4 border border-gray-100">
                        <span className="text-sm font-medium text-[#0a0a0a]">Furniture Scale</span>
                        <p className="text-xs text-gray-400 mt-1">
                          Artwork should complement your furniture scale. Large pieces work above sofas, while smaller pieces suit intimate seating areas.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      PLACEMENT GUIDE
                    </h4>
                    <div className="space-y-4">
                      {[
                        { height: "Eye Level", desc: "Center artwork at 57-60 inches from floor" },
                        { height: "Above Furniture", desc: "Leave 6-8 inches between furniture and artwork" },
                        { height: "Gallery Wall", desc: "Maintain 2-3 inches between multiple pieces" },
                        { height: "Statement Piece", desc: "Allow breathing room around large artworks" }
                      ].map((tip, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border border-gray-100">
                          <div className="w-6 h-6 bg-[#c8a830] text-white flex items-center justify-center text-xs rounded-full shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-[#0a0a0a]">{tip.height}</span>
                            <p className="text-xs text-gray-400">{tip.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}