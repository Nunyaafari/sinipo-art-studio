import { useState } from "react";

interface ContactFormProps {
  onClose?: () => void;
}

export default function ContactForm({ onClose }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In production, this would send to your backend
      // For now, we'll simulate sending
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Contact form submitted:', formData);
      setSent(true);
      
    } catch (error) {
      console.error('Contact form error:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="bg-white border border-gray-100 p-12">
            <div className="text-[#c8a830] mb-6">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1
              className="text-3xl font-light text-[#0a0a0a] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Message Sent!
            </h1>
            <p
              className="text-gray-600 mb-8"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Thank you for contacting us. We'll get back to you within 24 hours.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setFormData({ name: "", email: "", subject: "", message: "" });
              }}
              className="bg-[#0a0a0a] text-white px-8 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              SEND ANOTHER MESSAGE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <div
          className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          GET IN TOUCH
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Contact Us
        </h1>
        <p
          className="text-white/50 mt-3 text-sm tracking-wider font-light max-w-lg mx-auto"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div>
            <h2
              className="text-2xl font-light text-[#0a0a0a] mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Send us a Message
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  NAME *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  SUBJECT
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none bg-white transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="order">Order Question</option>
                  <option value="artwork">Artwork Inquiry</option>
                  <option value="shipping">Shipping & Delivery</option>
                  <option value="returns">Returns & Exchanges</option>
                  <option value="custom">Custom Order Request</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  MESSAGE *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none resize-none transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  rows={6}
                  placeholder="Tell us how we can help you..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 text-sm tracking-[0.2em] font-medium transition-all duration-300 ${
                  loading
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-[#0a0a0a] text-white hover:bg-[#c8a830]"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {loading ? "SENDING..." : "SEND MESSAGE"}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div>
            <h2
              className="text-2xl font-light text-[#0a0a0a] mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Get in Touch
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  EMAIL
                </h3>
                <a
                  href="mailto:hello@sinipo.art"
                  className="text-[#0a0a0a] hover:text-[#c8a830] transition-colors"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                >
                  hello@sinipo.art
                </a>
              </div>

              <div>
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  RESPONSE TIME
                </h3>
                <p className="text-gray-600" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  We typically respond within 24 hours during business days.
                </p>
              </div>

              <div>
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  BUSINESS HOURS
                </h3>
                <p className="text-gray-600" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Monday - Friday: 9:00 AM - 6:00 PM (GMT)<br />
                  Saturday: 10:00 AM - 4:00 PM (GMT)<br />
                  Sunday: Closed
                </p>
              </div>

              <div>
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  FOLLOW US
                </h3>
                <div className="flex gap-4">
                  {[
                    { name: "Instagram", icon: "IG" },
                    { name: "Facebook", icon: "FB" },
                    { name: "Pinterest", icon: "PI" },
                    { name: "Twitter", icon: "TW" }
                  ].map((social) => (
                    <button
                      key={social.name}
                      className="w-10 h-10 border border-gray-200 flex items-center justify-center text-xs text-gray-600 hover:border-[#c8a830] hover:text-[#c8a830] transition-colors"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {social.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#c8a830]/10 p-6">
                <h3 className="text-sm tracking-[0.2em] text-[#c8a830] mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  NEED IMMEDIATE HELP?
                </h3>
                <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  For urgent order inquiries, please include your order reference number in your message.
                </p>
                <p className="text-gray-600 text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  For artwork questions, feel free to include images or links to specific pieces you're interested in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}