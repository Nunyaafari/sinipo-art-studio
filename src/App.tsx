import { useState, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import ShopPage from "./components/ShopPage";
import ArtistsPage from "./components/ArtistsPage";
import AboutPage from "./components/AboutPage";
import CartSidebar from "./components/CartSidebar";
import Footer from "./components/Footer";
import ArtworkDetail from "./components/ArtworkDetail";
import CheckoutPage from "./components/CheckoutPage";
import PaymentCallback from "./components/PaymentCallback";
import AdminDashboard from "./components/AdminDashboard";
import OrderManagement from "./components/OrderManagement";
import BlogManagement from "./components/BlogManagement";
import MediaManagement from "./components/MediaManagement";
import SettingsManagement from "./components/SettingsManagement";
import BlogPage from "./components/BlogPage";
import AuthModal from "./components/AuthModal";
import UserProfile from "./components/UserProfile";
import ContactForm from "./components/ContactForm";
import LiveChat from "./components/LiveChat";
import ProductRecommendations from "./components/ProductRecommendations";
import RecentlyViewed from "./components/RecentlyViewed";
import AdvancedSearch from "./components/AdvancedSearch";
import SizeGuide from "./components/SizeGuide";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import WaitlistModal from "./components/WaitlistModal";
import type { Product } from "./data/products";
import { trackPageView } from "./lib/analytics";

interface CartItem {
  id: string;
  artwork: Product;
  quantity: number;
}

interface ReorderItem {
  artwork: Product;
  quantity: number;
  selectedFrame?: string;
  selectedVariantId?: string;
}

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [productReturnPage, setProductReturnPage] = useState("home");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderManagement, setShowOrderManagement] = useState(false);
  const [showBlogManagement, setShowBlogManagement] = useState(false);
  const [showMediaManagement, setShowMediaManagement] = useState(false);
  const [showSettingsManagement, setShowSettingsManagement] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [sizeGuideType, setSizeGuideType] = useState<"artwork" | "fashion">("artwork");
  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | "forgot-password">("login");
  const [settingsInitialTab, setSettingsInitialTab] = useState<"commerce" | "homepage" | "seo" | "team" | "discounts" | "audit">("commerce");

  useEffect(() => {
    const pageSegments = [activePage];

    if (selectedArtwork && activePage === "product") {
      pageSegments.push(String(selectedArtwork.id));
    } else if (showCheckout) {
      pageSegments.push("checkout");
    } else if (showUserProfile) {
      pageSegments.push("profile");
    } else if (showOrderManagement) {
      pageSegments.push("admin-orders");
    } else if (showBlogManagement) {
      pageSegments.push("admin-blog");
    } else if (showMediaManagement) {
      pageSegments.push("admin-media");
    } else if (showSettingsManagement) {
      pageSegments.push(`admin-settings-${settingsInitialTab}`);
    } else if (showAnalyticsDashboard) {
      pageSegments.push("admin-analytics");
    }

    trackPageView(`/${pageSegments.join("/")}`);
  }, [
    activePage,
    selectedArtwork,
    showCheckout,
    showUserProfile,
    showOrderManagement,
    showBlogManagement,
    showMediaManagement,
    showSettingsManagement,
    settingsInitialTab,
    showAnalyticsDashboard
  ]);

  const handleNavigate = (page: string) => {
    if (page === "login") {
      setAuthModalMode("login");
      setShowAuthModal(true);
      return;
    }
    if (page === "register") {
      setAuthModalMode("register");
      setShowAuthModal(true);
      return;
    }
    if (page === "profile") {
      if (!localStorage.getItem("authToken")) {
        setAuthModalMode("login");
        setShowAuthModal(true);
        return;
      }
      setShowUserProfile(true);
      return;
    }
    if (page === "contact") {
      setShowContactForm(true);
      return;
    }
    if (page === "search") {
      setShowAdvancedSearch(true);
      return;
    }
    if (page === "analytics") {
      setShowAnalyticsDashboard(true);
      return;
    }
    if (page === "orders") {
      setShowOrderManagement(true);
      return;
    }
    if (page === "discounts") {
      setSettingsInitialTab("discounts");
      setShowSettingsManagement(true);
      return;
    }
    if (page === "blog-management") {
      setShowBlogManagement(true);
      return;
    }
    if (page === "media-management") {
      setShowMediaManagement(true);
      return;
    }
    if (page === "settings") {
      setSettingsInitialTab("commerce");
      setShowSettingsManagement(true);
      return;
    }
    if (page === "audit-logs") {
      setSettingsInitialTab("audit");
      setShowSettingsManagement(true);
      return;
    }
    if (page === "users") {
      setSettingsInitialTab("team");
      setShowSettingsManagement(true);
      return;
    }
    if (page === "waitlist") {
      setShowWaitlistModal(true);
      return;
    }
    
    setActivePage(page);
    setSelectedArtwork(null);
    setShowCheckout(false);
    setShowOrderManagement(false);
    setShowBlogManagement(false);
    setShowMediaManagement(false);
    setShowSettingsManagement(false);
    setShowUserProfile(false);
    setShowContactForm(false);
    setShowAdvancedSearch(false);
    setShowSizeGuide(false);
    setShowAnalyticsDashboard(false);
    setShowWaitlistModal(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToCart = (artwork: Product, quantity = 1, selectedFrame?: string) => {
    const requestedQuantity = Math.max(1, quantity);
    const defaultVariant =
      artwork.productType === "fashion" && Array.isArray(artwork.variants) && artwork.variants.length > 0
        ? artwork.variants.find((variant) => variant.id === artwork.selectedVariantId) ||
          artwork.variants.find((variant) => variant.isDefault) ||
          artwork.variants[0]
        : null;
    const normalizedArtwork =
      artwork.productType === "fashion" && defaultVariant
        ? {
            ...artwork,
            selectedVariantId: defaultVariant.id,
            clothingSize: defaultVariant.size,
            color: defaultVariant.color,
            material: defaultVariant.material || artwork.material,
            sku: defaultVariant.sku || artwork.sku,
            price: defaultVariant.price ?? artwork.price,
            stockQuantity: defaultVariant.stockQuantity,
            inStock: defaultVariant.stockQuantity > 0,
          }
        : artwork;
    const normalizedFrame =
      normalizedArtwork.productType === "artwork"
        ? selectedFrame || normalizedArtwork.frameColor || "Gold"
        : normalizedArtwork.frameColor;
    const cartItemId =
      normalizedArtwork.productType === "artwork"
        ? `${normalizedArtwork.id}:${normalizedFrame}`
        : `${normalizedArtwork.id}:${normalizedArtwork.selectedVariantId || normalizedArtwork.sku || normalizedArtwork.clothingSize || "default"}`;
    const cartArtwork =
      normalizedArtwork.productType === "artwork"
        ? { ...normalizedArtwork, frameColor: normalizedFrame }
        : normalizedArtwork;
    const availableStock =
      cartArtwork.inStock === false ? 0 : Math.max(cartArtwork.stockQuantity ?? requestedQuantity, 0);

    if (availableStock === 0) {
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === cartItemId);
      const nextQuantity = Math.min(
        availableStock,
        (existing?.quantity || 0) + requestedQuantity
      );

      if (existing) {
        return prev.map((i) =>
          i.id === cartItemId ? { ...i, artwork: cartArtwork, quantity: nextQuantity } : i
        );
      }

      return [...prev, { id: cartItemId, artwork: cartArtwork, quantity: nextQuantity }];
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setCartItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) {
          return i;
        }

        const availableStock =
          i.artwork.inStock === false ? 0 : Math.max(i.artwork.stockQuantity ?? qty, 0);
        const safeQuantity = Math.max(1, Math.min(qty, availableStock || 1));

        return { ...i, quantity: safeQuantity };
      })
    );
  };

  const handleViewDetail = (artwork: Product) => {
    setProductReturnPage(activePage === "product" ? productReturnPage : activePage);
    setSelectedArtwork(artwork);
    setActivePage("product");
    setShowCheckout(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setShowCheckout(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePaymentSuccess = (reference: string) => {
    setCartItems([]); // Clear cart after successful payment
    setShowCheckout(false);
    setActivePage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCustomerAuthSuccess = (destination: "profile" | "admin") => {
    setShowAuthModal(false);
    setShowCheckout(false);
    setSelectedArtwork(null);
    setCartOpen(false);

    if (destination === "admin") {
      setShowUserProfile(false);
      handleNavigate("admin");
      return;
    }

    setShowUserProfile(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReorder = (items: ReorderItem[]) => {
    items.forEach((item) => {
      handleAddToCart(
        {
          ...item.artwork,
          selectedVariantId: item.selectedVariantId || item.artwork.selectedVariantId || null,
        },
        item.quantity,
        item.selectedFrame
      );
    });

    setShowUserProfile(false);
    setShowCheckout(false);
    setActivePage("shop");
    setCartOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalCartItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Check if we're on payment callback page
  const isPaymentCallback = window.location.pathname === '/payment/callback' || 
                           window.location.search.includes('reference=');

  // Check if we're on admin page
  const isAdminPage = window.location.pathname === '/admin' || activePage === 'admin';

  const renderPage = () => {
    // Show payment callback page
    if (isPaymentCallback) {
      return <PaymentCallback onNavigate={handleNavigate} />;
    }

    // Show analytics dashboard
    if (showAnalyticsDashboard) {
      return (
        <AnalyticsDashboard
          onBack={() => setShowAnalyticsDashboard(false)}
        />
      );
    }

    // Show waitlist modal
    if (showWaitlistModal) {
      return (
        <WaitlistModal
          isOpen={showWaitlistModal}
          onClose={() => setShowWaitlistModal(false)}
        />
      );
    }

    // Show advanced search
    if (showAdvancedSearch) {
      return (
        <AdvancedSearch
          onAddToCart={handleAddToCart}
          onViewDetail={handleViewDetail}
        />
      );
    }

    // Show contact form
    if (showContactForm) {
      return <ContactForm />;
    }

    // Show user profile
    if (showUserProfile) {
      return <UserProfile onBack={() => setShowUserProfile(false)} onReorder={handleReorder} />;
    }

    // Show blog management
    if (showBlogManagement) {
      return <BlogManagement onBack={() => setShowBlogManagement(false)} />;
    }

    // Show media management
    if (showMediaManagement) {
      return <MediaManagement onBack={() => setShowMediaManagement(false)} />;
    }

    // Show settings management
    if (showSettingsManagement) {
      return <SettingsManagement onBack={() => setShowSettingsManagement(false)} initialTab={settingsInitialTab} />;
    }

    // Show order management
    if (showOrderManagement) {
      return <OrderManagement onBack={() => setShowOrderManagement(false)} />;
    }

    // Show admin dashboard
    if (isAdminPage) {
      return <AdminDashboard onNavigate={handleNavigate} />;
    }

    // Show checkout page
    if (showCheckout && cartItems.length > 0) {
      return (
        <CheckoutPage
          items={cartItems}
          onBack={() => setShowCheckout(false)}
          onSuccess={handlePaymentSuccess}
          onUpdateQty={handleUpdateQty}
        />
      );
    }

    if (selectedArtwork && activePage === "product") {
      return (
        <ArtworkDetail
          artwork={selectedArtwork}
          onBack={() => {
            setSelectedArtwork(null);
            setActivePage(productReturnPage || "home");
          }}
          onAddToCart={handleAddToCart}
          onViewDetail={handleViewDetail}
        />
      );
    }

    switch (activePage) {
      case "home":
        return (
          <HomePage
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onViewDetail={handleViewDetail}
          />
        );
      case "shop":
        return <ShopPage onAddToCart={handleAddToCart} />;
      case "artists":
        return <ArtistsPage />;
      case "about":
        return <AboutPage />;
      case "collections":
        return <ShopPage onAddToCart={handleAddToCart} />;
      case "blog":
        return <BlogPage onNavigate={handleNavigate} onViewDetail={handleViewDetail} />;
      default:
        return (
          <HomePage
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onViewDetail={handleViewDetail}
          />
        );
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#fafaf8]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <Navbar
          cartCount={totalCartItems}
          onCartOpen={() => setCartOpen(true)}
          activePage={activePage}
          onNavigate={handleNavigate}
        />

        <main>{renderPage()}</main>

        {/* Footer only on non-home pages or on home */}
        <Footer onNavigate={handleNavigate} />

        <CartSidebar
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItems}
          onRemove={handleRemoveFromCart}
          onUpdateQty={handleUpdateQty}
          onCheckout={handleCheckout}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
          onAuthSuccess={handleCustomerAuthSuccess}
        />

        <LiveChat
          isOpen={showLiveChat}
          onClose={() => setShowLiveChat(false)}
        />

        {/* Live Chat Button */}
        {!showLiveChat && (
          <button
            onClick={() => setShowLiveChat(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[#c8a830] text-white rounded-full shadow-lg hover:bg-[#0a0a0a] transition-colors z-40 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}
      </div>
    </AuthProvider>
  );
}
