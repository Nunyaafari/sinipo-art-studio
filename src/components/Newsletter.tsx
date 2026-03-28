import { useState } from "react";

interface NewsletterProps {
  variant?: "inline" | "modal" | "footer";
  onClose?: () => void;
}

export default function Newsletter({ variant = "inline", onClose }: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:3001/api/notifications';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || 'Art Lover'
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubscribed(true);
        setEmail("");
        setFirstName("");
      } else {
        setError(data.error || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setError('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === "footer") {
    return (
      <div className="bg-[#0a0a0a] py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <span
            className="text-[#c8a830] text-xs tracking-[0.4em]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            JOIN THE COMMUNITY
          </span>
          <h2
            className="text-white text-3xl font-light mt-3 mb-4"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Stay Inspired
          </h2>
          <p
            className="text-white/50 text-sm mb-8 font-light"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Be first to discover new arrivals, exclusive collections, and private sale events.
          </p>

          {subscribed ? (
            <div className="text-center">
              <div className="text-[#c8a830] mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Thank you for subscribing!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-4">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name (optional)"
                className="w-full px-5 py-3 bg-white/10 border border-white/20 text-white text-sm placeholder-white/50 focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
              <div className="flex gap-0">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 px-5 py-3 bg-white/10 border border-white/20 text-white text-sm placeholder-white/50 focus:border-[#c8a830] focus:outline-none"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#c8a830] text-white px-6 py-3 text-xs tracking-[0.2em] hover:bg-white hover:text-[#0a0a0a] transition-colors duration-300 disabled:opacity-50"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {loading ? "..." : "SUBSCRIBE"}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2
                className="text-2xl font-light text-[#0a0a0a]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Join Our Community
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

            {/* Content */}
            <div className="p-6">
              {subscribed ? (
                <div className="text-center py-8">
                  <div className="text-[#c8a830] mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3
                    className="text-xl font-light text-[#0a0a0a] mb-2"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Welcome to Sinipo!
                  </h3>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    You'll receive our latest updates and exclusive offers.
                  </p>
                </div>
              ) : (
                <>
                  <p
                    className="text-gray-600 mb-6"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    Subscribe to receive updates on new artworks, exclusive collections, and special events.
                  </p>

                  <form onSubmit={handleSubscribe} className="space-y-4">
                    <div>
                      <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        FIRST NAME
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Your first name"
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      />
                    </div>

                    <div>
                      <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        EMAIL ADDRESS *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                        required
                      />
                    </div>

                    {error && (
                      <p className="text-red-500 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#0a0a0a] text-white py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {loading ? "SUBSCRIBING..." : "SUBSCRIBE"}
                    </button>
                  </form>

                  <p className="text-xs text-gray-400 mt-4 text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Inline variant
  return (
    <div className="bg-[#fafaf8] border border-gray-100 p-8">
      <div className="max-w-md mx-auto text-center">
        <span
          className="text-[#c8a830] text-xs tracking-[0.4em]"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          NEWSLETTER
        </span>
        <h2
          className="text-2xl font-light text-[#0a0a0a] mt-3 mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Stay Updated
        </h2>
        <p
          className="text-gray-600 text-sm mb-6"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Get the latest on new artworks, exclusive offers, and art world insights.
        </p>

        {subscribed ? (
          <div className="text-center">
            <div className="text-[#c8a830] mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Thank you for subscribing!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
              required
            />
            {error && (
              <p className="text-red-500 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0a0a0a] text-white py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {loading ? "SUBSCRIBING..." : "SUBSCRIBE"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}