import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import PaymentMethods from "./PaymentMethods";
import Certificates from "./Certificates";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import type { Product } from "../data/products";

interface UserProfileProps {
  onBack: () => void;
  onReorder: (items: Array<{ artwork: Product; quantity: number; selectedFrame?: string; selectedVariantId?: string }>) => void;
}

interface UserStats {
  wishlistCount: number;
  orderCount: number;
  reviewCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  averageRating: number;
}

interface Order {
  id: number;
  reference: string;
  items: Array<{
    productId: number;
    title: string;
    artist?: string;
    quantity: number;
    price: number;
    image?: string;
    images?: string[];
    productType?: "artwork" | "fashion";
    category?: string;
    subcategory?: string;
    style?: string;
    size?: string;
    dimensions?: string;
    clothingSize?: string;
    color?: string;
    material?: string;
    sku?: string;
    selectedVariantId?: string | null;
    description?: string;
    tags?: string[];
    careInstructions?: string;
    inStock?: boolean;
    stockQuantity?: number;
    frameColor?: string | null;
  }>;
  total: number;
  shipping?: number;
  subtotal?: number;
  discountAmount?: number;
  status: string;
  date: string;
  customerInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  paymentMode?: string;
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string | null;
  processingAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  inventoryAdjustedAt?: string | null;
  inventoryRestoredAt?: string | null;
  trackingNumber?: string | null;
}

interface Review {
  id: number;
  productId: number;
  rating: number;
  comment: string;
  date: string;
}

interface Address {
  id: number;
  label: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: unknown) => `$${asNumber(value).toLocaleString()}`;

const formatDate = (value?: string | null, fallback = "N/A") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString();
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case "paid":
      return "Paid";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
    case "completed":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
};

const getOrderItemPreviewImage = (item: Order["items"][number]) =>
  item.image || item.images?.[0] || "";

export default function UserProfile({ onBack, onReorder }: UserProfileProps) {
  const { user, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [orderMessage, setOrderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    country: ""
  });

  const token = localStorage.getItem('authToken');
  const API_BASE = apiUrl('/api/user');

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      address: user?.address || "",
      city: user?.city || "",
      country: user?.country || ""
    });
  }, [user]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    void fetchUserData();
  }, [token]);

  const fetchUserData = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [statsRes, ordersRes, reviewsRes, addressesRes, wishlistRes] = await Promise.all([
        fetch(`${API_BASE}/stats`, { headers }),
        fetch(`${API_BASE}/orders`, { headers }),
        fetch(`${API_BASE}/reviews`, { headers }),
        fetch(`${API_BASE}/addresses`, { headers }),
        fetch(`${API_BASE}/wishlist`, { headers })
      ]);

      const [statsData, ordersData, reviewsData, addressesData, wishlistData] = await Promise.all([
        statsRes.json(),
        ordersRes.json(),
        reviewsRes.json(),
        addressesRes.json(),
        wishlistRes.json()
      ]);

      if (statsData.success && statsData.data) {
        setStats({
          wishlistCount: asNumber(statsData.data.wishlistCount),
          orderCount: asNumber(statsData.data.orderCount),
          reviewCount: asNumber(statsData.data.reviewCount),
          totalSpent: asNumber(statsData.data.totalSpent),
          loyaltyPoints: asNumber(statsData.data.loyaltyPoints),
          loyaltyTier: typeof statsData.data.loyaltyTier === "string" ? statsData.data.loyaltyTier : "Bronze",
          averageRating: asNumber(statsData.data.averageRating),
        });
      } else {
        setStats(null);
      }
      if (ordersData.success) {
        const normalizedOrders = Array.isArray(ordersData.data) ? ordersData.data : [];
        setOrders(normalizedOrders);
        setSelectedOrderId((current) => current ?? normalizedOrders[0]?.id ?? null);
      }
      if (reviewsData.success) setReviews(Array.isArray(reviewsData.data) ? reviewsData.data : []);
      if (addressesData.success) setAddresses(Array.isArray(addressesData.data) ? addressesData.data : []);
      if (wishlistData.success) setWishlist(Array.isArray(wishlistData.data) ? wishlistData.data : []);

    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setProfileMessage({ type: "error", text: getNetworkErrorMessage(error, "Failed to load your account data") });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileFieldChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    setProfileMessage(null);
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    const result = await updateProfile(profileForm);
    setProfileMessage({
      type: result.success ? "success" : "error",
      text: result.message
    });
    setProfileSaving(false);
  };

  const getLoyaltyColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "text-purple-600";
      case "Gold": return "text-yellow-600";
      case "Silver": return "text-gray-500";
      default: return "text-orange-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "paid": return "bg-emerald-100 text-emerald-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-indigo-100 text-indigo-800";
      case "delivered":
      case "completed": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "refunded": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const selectedOrder =
    selectedOrderId === null
      ? null
      : orders.find((order) => order.id === selectedOrderId) || null;

  const buildProductFromOrderItem = (item: Order["items"][number]): Product => {
    const productType = item.productType === "fashion" ? "fashion" : "artwork";

    return {
      id: item.productId,
      title: item.title,
      artist: item.artist || "Sinipo Art Studio",
      price: item.price,
      category: item.category || "General",
      subcategory: item.subcategory || item.category || "General",
      productType,
      size: item.size || item.clothingSize || "Medium",
      dimensions: item.dimensions || "",
      clothingSize: item.clothingSize || undefined,
      color: item.color || undefined,
      material: item.material || undefined,
      sku: item.sku || undefined,
      selectedVariantId: item.selectedVariantId || null,
      image: item.image || "",
      images: item.images && item.images.length > 0 ? item.images : item.image ? [item.image] : [],
      frameColor: item.frameColor || (productType === "fashion" ? "N/A" : "Gold"),
      description: item.description || "",
      tags: item.tags || [],
      inStock: item.inStock ?? true,
      stockQuantity: item.stockQuantity ?? Math.max(item.quantity, 1),
      careInstructions: item.careInstructions || undefined,
      style: item.style || (productType === "fashion" ? "Fashion" : "Contemporary"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleReorderOrder = (order: Order) => {
    const reorderableItems = order.items
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => ({
        artwork: buildProductFromOrderItem(item),
        quantity: item.quantity,
        selectedFrame: item.frameColor || undefined,
        selectedVariantId: item.selectedVariantId || undefined,
      }));

    if (reorderableItems.length === 0) {
      setOrderMessage({
        type: "error",
        text: "This order does not have any available items to reorder.",
      });
      return;
    }

    onReorder(reorderableItems);
    setOrderMessage({
      type: "success",
      text: `Added ${reorderableItems.length} item${reorderableItems.length === 1 ? "" : "s"} from order ${order.reference} to your cart.`,
    });
  };

  const timelineRows = selectedOrder
    ? [
        { label: "Order placed", value: selectedOrder.createdAt || selectedOrder.date },
        { label: "Payment confirmed", value: selectedOrder.paidAt },
        { label: "Preparing your order", value: selectedOrder.processingAt },
        { label: "Shipped", value: selectedOrder.shippedAt },
        { label: "Delivered", value: selectedOrder.deliveredAt },
        { label: "Refunded", value: selectedOrder.refundedAt },
        { label: "Cancelled", value: selectedOrder.cancelledAt },
        { label: "Inventory reserved", value: selectedOrder.inventoryAdjustedAt },
        { label: "Inventory restored", value: selectedOrder.inventoryRestoredAt },
        { label: "Last updated", value: selectedOrder.updatedAt },
      ].filter((entry) => entry.value)
    : [];

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="bg-white border border-gray-100 p-12">
            <h1
              className="text-3xl font-light text-[#0a0a0a] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Sign In Required
            </h1>
            <p className="text-gray-600 mb-8">
              Please sign in to view your account, orders, saved addresses, and certificates.
            </p>
            <button
              onClick={onBack}
              className="border border-gray-200 text-gray-600 px-8 py-3 text-xs tracking-[0.2em] hover:border-gray-400 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              BACK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
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
          MY ACCOUNT
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Welcome, {user?.firstName}
        </h1>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs tracking-[0.15em] text-gray-600 hover:text-[#c8a830] transition-colors mb-8"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          BACK TO SHOP
        </button>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                LOYALTY TIER
              </h3>
              <p className={`text-3xl font-light ${getLoyaltyColor(stats.loyaltyTier)}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.loyaltyTier}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stats.loyaltyPoints} points</p>
            </div>
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                TOTAL ORDERS
              </h3>
              <p className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.orderCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">${stats.totalSpent.toLocaleString()} spent</p>
            </div>
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                WISHLIST
              </h3>
              <p className="text-3xl font-light text-[#c8a830]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.wishlistCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">items saved</p>
            </div>
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                REVIEWS
              </h3>
              <p className="text-3xl font-light text-purple-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {stats.reviewCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">avg {stats.averageRating} stars</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
          {[
            { id: "overview", label: "Overview" },
            { id: "orders", label: "Order History" },
            { id: "wishlist", label: "Wishlist" },
            { id: "addresses", label: "Addresses" },
            { id: "payment", label: "Payment Methods" },
            { id: "certificates", label: "Certificates" },
            { id: "reviews", label: "Reviews" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs tracking-[0.15em] transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[#0a0a0a] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-100 p-8">
          {activeTab === "overview" && (
            <div>
              <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Account Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    PERSONAL INFORMATION
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-700"><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                    <p className="text-gray-700"><strong>Email:</strong> {user?.email}</p>
                    <p className="text-gray-700"><strong>Member since:</strong> {formatDate(user?.createdAt)}</p>
                    <p className="text-gray-700"><strong>Email verified:</strong> {user?.isVerified ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    PROFILE SETTINGS
                  </h3>
                  {profileMessage && (
                    <div className={`mb-4 px-4 py-3 text-sm border ${
                      profileMessage.type === "success"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                      {profileMessage.text}
                    </div>
                  )}
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => handleProfileFieldChange("firstName", e.target.value)}
                        placeholder="First name"
                        className="border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => handleProfileFieldChange("lastName", e.target.value)}
                        placeholder="Last name"
                        className="border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => handleProfileFieldChange("phone", e.target.value)}
                      placeholder="Phone"
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => handleProfileFieldChange("address", e.target.value)}
                      placeholder="Address"
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => handleProfileFieldChange("city", e.target.value)}
                        placeholder="City"
                        className="border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={profileForm.country}
                        onChange={(e) => handleProfileFieldChange("country", e.target.value)}
                        placeholder="Country"
                        className="border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="bg-[#0a0a0a] text-white px-6 py-3 text-xs tracking-[0.18em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {profileSaving ? "SAVING..." : "SAVE PROFILE"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("orders")}
                        className="border border-gray-200 px-6 py-3 text-xs tracking-[0.18em] text-gray-600 hover:border-[#c8a830] hover:text-[#c8a830] transition-colors"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        VIEW ORDERS
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Order History
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Review your past purchases, track fulfillment, and reorder in one click.
                  </p>
                </div>
                {selectedOrder && (
                  <button
                    type="button"
                    onClick={() => handleReorderOrder(selectedOrder)}
                    className="bg-[#0a0a0a] text-white px-6 py-3 text-xs tracking-[0.18em] hover:bg-[#c8a830] transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    REORDER SELECTED ORDER
                  </button>
                )}
              </div>
              {orderMessage && (
                <div
                  className={`mb-6 px-4 py-3 text-sm border ${
                    orderMessage.type === "success"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {orderMessage.text}
                </div>
              )}
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders yet</p>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.85fr)] gap-6">
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setOrderMessage(null);
                        }}
                        className={`w-full border p-6 text-left transition-colors ${
                          selectedOrder?.id === order.id
                            ? "border-[#c8a830] bg-[#fffaf0]"
                            : "border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4 mb-4">
                          <div>
                            <h3 className="text-lg font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                              Order #{order.reference}
                            </h3>
                            <p className="text-xs text-gray-400">{formatDate(order.date)}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] px-2 py-1 rounded ${getStatusColor(order.status)}`}>
                              {formatStatusLabel(order.status).toUpperCase()}
                            </span>
                            <p className="text-lg font-light text-[#0a0a0a] mt-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          {order.items.slice(0, 2).map((item, index) => (
                            <div key={`${order.reference}-${index}`} className="flex items-center gap-3">
                              {getOrderItemPreviewImage(item) ? (
                                <div className="h-12 w-10 overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                                  <img
                                    src={assetUrl(getOrderItemPreviewImage(item))}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-12 w-10 items-center justify-center border border-gray-200 bg-gray-50 text-[10px] uppercase tracking-[0.14em] text-gray-400 shrink-0">
                                  Item
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate">
                                  {item.title} × {item.quantity}
                                </p>
                                <p className="truncate text-xs text-gray-400">
                                  {item.frameColor ? `Frame: ${item.frameColor}` : item.sku ? item.sku : item.artist || "Sinipo Art Studio"}
                                </p>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-xs text-gray-400">+{order.items.length - 2} more items</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedOrder ? (
                    <div className="border border-gray-100 p-6 bg-[#fcfcfb]">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                        <div>
                          <h3 className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {selectedOrder.reference}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {selectedOrder.paymentMode === "mock" ? "Test payment order" : "Customer order"}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded ${getStatusColor(selectedOrder.status)}`}>
                          {formatStatusLabel(selectedOrder.status).toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white border border-gray-100 p-4">
                          <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1">TOTAL</p>
                          <p className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {formatCurrency(selectedOrder.total)}
                          </p>
                        </div>
                        <div className="bg-white border border-gray-100 p-4">
                          <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1">TRACKING</p>
                          <p className="text-sm text-[#0a0a0a]">
                            {selectedOrder.trackingNumber || (selectedOrder.status === "shipped" || selectedOrder.status === "delivered"
                              ? "Tracking assigned internally"
                              : "Available after dispatch")}
                          </p>
                        </div>
                        <div className="bg-white border border-gray-100 p-4">
                          <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1">SHIP TO</p>
                          <p className="text-sm text-[#0a0a0a]">
                            {selectedOrder.customerInfo?.city || user?.city || "N/A"}
                            {selectedOrder.customerInfo?.country ? `, ${selectedOrder.customerInfo.country}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <p className="text-xs tracking-[0.2em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          FULFILLMENT TIMELINE
                        </p>
                        <div className="space-y-2">
                          {timelineRows.length > 0 ? (
                            timelineRows.map((entry) => (
                              <div key={`${entry.label}-${entry.value}`} className="flex items-center justify-between gap-4 text-sm text-gray-600">
                                <span>{entry.label}</span>
                                <span>{new Date(entry.value as string).toLocaleString()}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">Tracking updates will appear here as your order moves forward.</p>
                          )}
                        </div>
                      </div>

                      <div className="mb-6">
                        <p className="text-xs tracking-[0.2em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          ORDER ITEMS
                        </p>
                        <div className="space-y-3">
                          {selectedOrder.items.map((item, index) => (
                            <div key={`${selectedOrder.reference}-${index}`} className="bg-white border border-gray-100 p-4 flex gap-4">
                              {item.image ? (
                                <div className="w-16 h-20 border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                                  <img src={assetUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                              ) : null}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h4 className="text-lg font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                      {item.title}
                                    </h4>
                                    <p className="text-sm text-gray-500">{item.artist || "Sinipo Art Studio"}</p>
                                  </div>
                                  <p className="text-lg font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                    {formatCurrency(item.price * item.quantity)}
                                  </p>
                                </div>
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                  <p>Quantity: {item.quantity}</p>
                                  {item.frameColor ? <p>Frame: {item.frameColor}</p> : null}
                                  {item.color ? <p>Color: {item.color}</p> : null}
                                  {item.clothingSize ? <p>Size: {item.clothingSize}</p> : item.size ? <p>Size: {item.size}</p> : null}
                                  {item.sku ? <p>SKU: {item.sku}</p> : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white border border-gray-100 p-4">
                          <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-2">DELIVERY ADDRESS</p>
                          <p className="text-sm text-gray-700">
                            {selectedOrder.customerInfo?.firstName} {selectedOrder.customerInfo?.lastName}
                          </p>
                          <p className="text-sm text-gray-700">{selectedOrder.customerInfo?.address}</p>
                          <p className="text-sm text-gray-700">
                            {selectedOrder.customerInfo?.city}, {selectedOrder.customerInfo?.country}
                          </p>
                          {selectedOrder.customerInfo?.phone ? (
                            <p className="text-sm text-gray-700">{selectedOrder.customerInfo.phone}</p>
                          ) : null}
                        </div>
                        <div className="bg-white border border-gray-100 p-4">
                          <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-2">ORDER SUMMARY</p>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span>{formatCurrency(selectedOrder.subtotal ?? selectedOrder.total)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Shipping</span>
                              <span>{selectedOrder.shipping === 0 ? "FREE" : formatCurrency(selectedOrder.shipping ?? 0)}</span>
                            </div>
                            {selectedOrder.discountAmount ? (
                              <div className="flex justify-between text-green-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                              </div>
                            ) : null}
                            <div className="flex justify-between pt-2 border-t border-gray-100 text-[#0a0a0a]">
                              <span>Total</span>
                              <span>{formatCurrency(selectedOrder.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleReorderOrder(selectedOrder)}
                          className="bg-[#0a0a0a] text-white px-6 py-3 text-xs tracking-[0.18em] hover:bg-[#c8a830] transition-colors"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          REORDER ITEMS
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(null)}
                          className="border border-gray-200 px-6 py-3 text-xs tracking-[0.18em] text-gray-600 hover:border-gray-400 transition-colors"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          CLEAR SELECTION
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {activeTab === "wishlist" && (
            <div>
              <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                My Wishlist
              </h2>
              {wishlist.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your wishlist is empty</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlist.map((productId) => (
                    <div key={productId} className="border border-gray-100 p-4">
                      <p className="text-sm text-gray-600">Product ID: {productId}</p>
                      <p className="text-xs text-gray-400 mt-1">View in shop to see details</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div>
              <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Saved Addresses
              </h2>
              {addresses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No addresses saved</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map((address) => (
                    <div key={address.id} className="border border-gray-100 p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {address.label}
                        </h3>
                        {address.isDefault && (
                          <span className="text-[10px] bg-[#c8a830] text-white px-2 py-1 rounded">DEFAULT</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{address.firstName} {address.lastName}</p>
                      <p className="text-sm text-gray-600">{address.address}</p>
                      <p className="text-sm text-gray-600">{address.city}, {address.country}</p>
                      <p className="text-sm text-gray-600">{address.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "payment" && (
            <PaymentMethods onBack={() => setActiveTab("overview")} />
          )}

          {activeTab === "certificates" && (
            <Certificates onBack={() => setActiveTab("overview")} />
          )}

          {activeTab === "reviews" && (
            <div>
              <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                My Reviews
              </h2>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-gray-100 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">Product ID: {review.productId}</span>
                      </div>
                      <p className="text-gray-700 mb-2">{review.comment}</p>
                      <p className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="mt-8 text-center">
          <button
            onClick={logout}
            className="border border-gray-200 text-gray-600 px-8 py-3 text-xs tracking-[0.2em] hover:border-red-400 hover:text-red-500 transition-colors"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  );
}
