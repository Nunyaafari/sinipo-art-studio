import { useState } from "react";

interface SocialShareProps {
  productId: number;
  productTitle: string;
  productImage: string;
  onClose: () => void;
}

export default function SocialShare({ productId, productTitle, productImage, onClose }: SocialShareProps) {
  const [shared, setShared] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const token = localStorage.getItem('authToken');
  const API_BASE = 'http://localhost:3001/api/social';

  const platforms = [
    {
      id: "facebook",
      name: "Facebook",
      icon: (
        <svg className="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      id: "twitter",
      name: "Twitter",
      icon: (
        <svg className="w-6 h-6" fill="#1DA1F2" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 12.073z"/>
        </svg>
      ),
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      id: "twitter",
      name: "Twitter",
      icon: (
        <svg className="w-6 h-6" fill="#1DA1F2" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.986 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      ),
      color: "bg-sky-500 hover:bg-sky-600"
    },
    {
      id: "pinterest",
      name: "Pinterest",
      icon: (
        <svg className="w-6 h-6" fill="#E60023" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/>
        </svg>
      ),
      color: "bg-red-600 hover:bg-red-700"
    },
    {
      id: "email",
      name: "Email",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: "bg-gray-600 hover:bg-gray-700"
    },
    {
      id: "copy",
      name: "Copy Link",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      ),
      color: "bg-gray-500 hover:bg-gray-600"
    }
  ];

  const handleShare = async (platform: string) => {
    setSelectedPlatform(platform);
    
    const shareUrl = `${window.location.origin}/product/${productId}`;
    const shareText = `Check out "${productTitle}" on Sinipo Art Studio`;

    let shareLink = "";
    
    switch (platform) {
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case "pinterest":
        shareLink = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(productImage)}&description=${encodeURIComponent(shareText)}`;
        break;
      case "email":
        shareLink = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        break;
      case "copy":
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShared(true);
          setTimeout(() => setShared(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
        return;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }

    // Record share in backend
    if (token) {
      try {
        await fetch(`${API_BASE}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId,
            platform,
            message: shareText
          })
        });
      } catch (error) {
        console.error('Failed to record share:', error);
      }
    }

    setShared(true);
    setTimeout(() => {
      setShared(false);
      setSelectedPlatform(null);
    }, 2000);
  };

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
              Share This Artwork
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
            {/* Product Preview */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50">
              <div className="w-16 h-20 border-2 border-gray-200 overflow-hidden">
                <img
                  src={productImage}
                  alt={productTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3
                  className="text-lg font-light text-[#0a0a0a]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {productTitle}
                </h3>
                <p className="text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Share this beautiful piece with your friends
                </p>
              </div>
            </div>

            {/* Share Platforms */}
            <div className="space-y-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleShare(platform.id)}
                  disabled={shared && selectedPlatform === platform.id}
                  className={`w-full flex items-center gap-4 p-4 border border-gray-200 hover:border-gray-400 transition-all duration-200 ${
                    shared && selectedPlatform === platform.id ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${platform.color}`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      {platform.name}
                    </span>
                    {shared && selectedPlatform === platform.id && (
                      <span className="block text-xs text-green-600 mt-1">
                        {platform.id === 'copy' ? 'Link copied!' : 'Shared successfully!'}
                      </span>
                    )}
                  </div>
                  {shared && selectedPlatform === platform.id ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Share Stats */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Share this artwork to help others discover beautiful art
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}