import { useState, useEffect } from "react";

interface Collection {
  id: string;
  name: string;
  description: string;
  launchDate: string;
  status: string;
  image: string;
  subscriberCount: number;
}

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection?: Collection;
}

export default function WaitlistModal({ isOpen, onClose, collection }: WaitlistModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);

  const API_BASE = 'http://localhost:3001/api/waitlist';

  useEffect(() => {
    if (isOpen && !collection) {
      fetchCollections();
    }
  }, [isOpen, collection]);

  const fetchCollections = async () => {
    try {
      const response = await fetch(`${API_BASE}/collections?status=upcoming`);
      const data = await response.json();
      if (data.success) {
        setCollections(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  };

  const handleJoinWaitlist = async (collectionId: string) => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collectionId,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubscribed(true);
        setEmail("");
        setFirstName("");
        setLastName("");
      } else {
        setError(data.error || 'Failed to join waitlist');
      }
    } catch (error) {
      console.error('Join waitlist error:', error);
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilLaunch = (launchDate: string) => {
    const now = new Date();
    const launch = new Date(launchDate);
    const diffTime = launch.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
        <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2
              className="text-2xl font-light text-[#0a0a0a]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {collection ? `Join Waitlist` : 'Upcoming Collections'}
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
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3
                  className="text-xl font-light text-[#0a0a0a] mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  You're on the list!
                </h3>
                <p className="text-gray-600 text-sm" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  We'll notify you when the collection launches.
                </p>
              </div>
            ) : collection ? (
              /* Single Collection View */
              <div>
                <div className="mb-6">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    className="w-full h-48 object-cover mb-4"
                  />
                  <h3
                    className="text-xl font-light text-[#0a0a0a] mb-2"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {collection.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {collection.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    <span>Launch: {formatDate(collection.launchDate)}</span>
                    <span>•</span>
                    <span>{getDaysUntilLaunch(collection.launchDate)} days to go</span>
                    <span>•</span>
                    <span>{collection.subscriberCount} subscribers</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h4 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    GET NOTIFIED WHEN IT LAUNCHES
                  </h4>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address"
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    />
                    <button
                      onClick={() => handleJoinWaitlist(collection.id)}
                      disabled={loading}
                      className="w-full bg-[#0a0a0a] text-white py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {loading ? "JOINING..." : "JOIN WAITLIST"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Collections List */
              <div>
                <p className="text-gray-600 mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Be the first to know when our new collections launch. Join the waitlist for exclusive early access.
                </p>

                {collections.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      No upcoming collections at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {collections.map((col) => (
                      <div key={col.id} className="border border-gray-100 p-6">
                        <div className="flex gap-4">
                          <img
                            src={col.image}
                            alt={col.name}
                            className="w-24 h-24 object-cover"
                          />
                          <div className="flex-1">
                            <h3
                              className="text-lg font-light text-[#0a0a0a] mb-1"
                              style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                              {col.name}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                              {col.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                              <span>Launch: {formatDate(col.launchDate)}</span>
                              <span>•</span>
                              <span>{getDaysUntilLaunch(col.launchDate)} days</span>
                              <span>•</span>
                              <span>{col.subscriberCount} subscribers</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleJoinWaitlist(col.id)}
                            disabled={loading}
                            className="w-full bg-[#0a0a0a] text-white py-2 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                            style={{ fontFamily: "'Montserrat', sans-serif" }}
                          >
                            {loading ? "JOINING..." : "JOIN WAITLIST"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}