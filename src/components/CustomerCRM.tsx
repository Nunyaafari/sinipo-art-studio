import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import { getAdminRequestHeaders, getRoleLabel, hasAdminPanelAccess } from "../lib/admin";

interface CustomerCRMProps {
  onBack: () => void;
}

interface CustomerRecord {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string | null;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  metrics: {
    totalSpent: number;
    orderCount: number;
    wishlistCount: number;
    reviewCount: number;
    addressCount: number;
    loyaltyPoints: number;
    loyaltyTier: string;
  };
  lastOrderAt?: string | null;
  lastOrderReference?: string | null;
  lastActivityAt?: string | null;
  recentOrders: Array<{
    reference: string;
    status: string;
    amount: number;
    createdAt: string;
    itemCount: number;
  }>;
  wishlistItems: Array<{
    productId: number;
    title: string;
    image?: string;
    category?: string;
    productType?: string;
  }>;
  recentlyViewed: Array<{
    productId: number;
    title: string;
    image?: string;
    category?: string;
    viewedAt: string;
    viewCount: number;
  }>;
  recentReviews: Array<{
    id: number;
    productId: number;
    rating: number;
    comment: string;
    date: string;
  }>;
  addresses: Array<{
    id: number;
    label?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
  }>;
}

interface CustomerCRMStats {
  totalCustomers: number;
  verifiedCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  totalOrders: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const formatDate = (value?: string | null, fallback = "Never") => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleString();
};

const formatStatusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());

export default function CustomerCRM({ onBack }: CustomerCRMProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [stats, setStats] = useState<CustomerCRMStats | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasPanelAccess = hasAdminPanelAccess(user?.role);

  const fetchCustomers = async () => {
    if (!hasPanelAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const query = new URLSearchParams();
      if (search.trim()) {
        query.set("search", search.trim());
      }

      const response = await fetch(apiUrl(`/api/admin/customers?${query.toString()}`), {
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load customer CRM");
      }

      const nextCustomers = Array.isArray(data.data?.customers) ? data.data.customers : [];
      setCustomers(nextCustomers);
      setStats(data.data?.stats ?? null);
      setSelectedCustomerId((current) => current ?? nextCustomers[0]?.id ?? null);
      setError(null);
    } catch (fetchError) {
      setError(getNetworkErrorMessage(fetchError, "Failed to load customer CRM"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, [hasPanelAccess, search]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) || customers[0] || null,
    [customers, selectedCustomerId]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#c8a830] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading CRM access...</p>
        </div>
      </div>
    );
  }

  if (!hasPanelAccess) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">CUSTOMER CRM</p>
          <h1 className="mt-4 text-4xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Sign in with a backend role to review customer details and activity.
          </p>
          <button
            onClick={onBack}
            className="mt-6 border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] pt-24">
      <div className="border-y border-black/10 bg-[#111] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">CUSTOMER RELATIONSHIP</p>
            <h1 className="mt-3 text-4xl font-light md:text-5xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              CRM
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Review client details, purchase behavior, and storefront activity separately from backend staff accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 px-4 py-2 text-[11px] tracking-[0.18em] text-white/80">
              {getRoleLabel(user?.role)}
            </span>
            <button
              onClick={onBack}
              className="border border-white/20 px-4 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:border-[#d8c06a] hover:text-[#d8c06a]"
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-6 py-8 lg:px-10">
        {error ? (
          <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {stats ? (
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
            {[
              { label: "Total Clients", value: stats.totalCustomers },
              { label: "Verified", value: stats.verifiedCustomers },
              { label: "Active 30d", value: stats.activeCustomers },
              { label: "Orders", value: stats.totalOrders },
              { label: "Revenue", value: formatCurrency(stats.totalRevenue) },
            ].map((card) => (
              <div key={card.label} className="border border-black/10 bg-white px-4 py-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{card.label}</p>
                <p className="mt-2 text-3xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="border border-black/10 bg-white">
            <div className="border-b border-black/10 px-6 py-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Client Directory</p>
              <h2 className="mt-2 text-3xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Customers
              </h2>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, phone, or order"
                className="mt-4 w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-gray-500">Loading clients...</div>
            ) : customers.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-gray-500">No customers matched this search.</div>
            ) : (
              <div className="max-h-[920px] overflow-y-auto">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`w-full border-b border-black/5 px-6 py-5 text-left transition-colors ${
                      selectedCustomer?.id === customer.id ? "bg-[#fffaf0]" : "hover:bg-[#faf8f2]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {customer.fullName}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">{customer.email}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                          Last active {formatDate(customer.lastActivityAt, "No recent activity")}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        customer.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {customer.isVerified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      <span>{customer.metrics.orderCount} orders</span>
                      <span>•</span>
                      <span>{formatCurrency(customer.metrics.totalSpent)}</span>
                      <span>•</span>
                      <span>{customer.metrics.loyaltyTier}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="border border-black/10 bg-white">
            {!selectedCustomer ? (
              <div className="px-6 py-16 text-center text-sm text-gray-500">Select a customer to review activity.</div>
            ) : (
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Client Profile</p>
                    <h2 className="mt-2 text-4xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {selectedCustomer.fullName}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">{selectedCustomer.email}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Joined {formatDate(selectedCustomer.createdAt)}</p>
                    <p className="mt-1">Last login {formatDate(selectedCustomer.lastLogin)}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-6">
                  {[
                    { label: "Total Spend", value: formatCurrency(selectedCustomer.metrics.totalSpent) },
                    { label: "Orders", value: selectedCustomer.metrics.orderCount },
                    { label: "Wishlist", value: selectedCustomer.metrics.wishlistCount },
                    { label: "Reviews", value: selectedCustomer.metrics.reviewCount },
                    { label: "Addresses", value: selectedCustomer.metrics.addressCount },
                    { label: "Loyalty", value: `${selectedCustomer.metrics.loyaltyPoints} pts` },
                  ].map((card) => (
                    <div key={card.label} className="border border-black/10 bg-[#fbfaf6] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{card.label}</p>
                      <p className="mt-2 text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <section className="border border-black/10 bg-[#fbfaf6] p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Contact</p>
                      <div className="mt-4 space-y-3 text-sm text-gray-600">
                        <p>{selectedCustomer.phone || "No phone on file"}</p>
                        <p>{selectedCustomer.address || "No primary address on file"}</p>
                        <p>{[selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(", ") || "Location not provided"}</p>
                        <p>Loyalty tier: {selectedCustomer.metrics.loyaltyTier}</p>
                      </div>
                    </section>

                    <section className="border border-black/10 bg-[#fbfaf6] p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Recent Reviews</p>
                      <div className="mt-4 space-y-4">
                        {selectedCustomer.recentReviews.length === 0 ? (
                          <p className="text-sm text-gray-500">No reviews submitted yet.</p>
                        ) : (
                          selectedCustomer.recentReviews.map((review) => (
                            <div key={review.id} className="border border-black/5 bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                                Product #{review.productId} • {review.rating}/5
                              </p>
                              <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
                              <p className="mt-2 text-xs text-gray-400">{formatDate(review.date)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="border border-black/10 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Order Activity</p>
                          <h3 className="mt-2 text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            Recent Orders
                          </h3>
                        </div>
                        {selectedCustomer.lastOrderReference ? (
                          <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                            Latest {selectedCustomer.lastOrderReference}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3">
                        {selectedCustomer.recentOrders.length === 0 ? (
                          <p className="text-sm text-gray-500">No orders yet.</p>
                        ) : (
                          selectedCustomer.recentOrders.map((order) => (
                            <div key={order.reference} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border border-black/5 bg-[#fbfaf6] px-4 py-4">
                              <div>
                                <p className="text-sm font-medium text-[#111]">{order.reference}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-400">
                                  {formatStatusLabel(order.status)} • {order.itemCount} items
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-[#111]">{formatCurrency(order.amount)}</p>
                                <p className="mt-1 text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className="border border-black/10 p-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Wishlist Snapshot</p>
                        <div className="mt-4 space-y-3">
                          {selectedCustomer.wishlistItems.length === 0 ? (
                            <p className="text-sm text-gray-500">No wishlist activity yet.</p>
                          ) : (
                            selectedCustomer.wishlistItems.map((item) => (
                              <div key={item.productId} className="flex items-center gap-3">
                                <div className="h-14 w-12 overflow-hidden border border-black/10 bg-[#fbfaf6]">
                                  {item.image ? (
                                    <img src={assetUrl(item.image)} alt={item.title} className="h-full w-full object-cover" />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-[#111]">{item.title}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-400">{item.category}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="border border-black/10 p-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Recently Viewed</p>
                        <div className="mt-4 space-y-3">
                          {selectedCustomer.recentlyViewed.length === 0 ? (
                            <p className="text-sm text-gray-500">No browsing activity captured yet.</p>
                          ) : (
                            selectedCustomer.recentlyViewed.map((item) => (
                              <div key={`${item.productId}-${item.viewedAt}`} className="flex items-center gap-3">
                                <div className="h-14 w-12 overflow-hidden border border-black/10 bg-[#fbfaf6]">
                                  {item.image ? (
                                    <img src={assetUrl(item.image)} alt={item.title} className="h-full w-full object-cover" />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-[#111]">{item.title}</p>
                                  <p className="mt-1 text-xs text-gray-400">
                                    {item.viewCount} views • {formatDate(item.viewedAt)}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
