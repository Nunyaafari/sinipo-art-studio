import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import {
  canEditAdminContent,
  getAdminRequestHeaders,
  getRoleLabel,
  hasAdminPanelAccess
} from "../lib/admin";

interface Order {
  reference: string;
  email: string;
  amount: number;
  subtotal?: number;
  shipping?: number;
  discountAmount?: number;
  items: Array<{
    artwork: {
      id: number;
      title: string;
      artist: string;
      price: number;
      image: string;
      frameColor?: string;
    };
    quantity: number;
  }>;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  processingAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  inventoryAdjustedAt?: string;
  inventoryRestoredAt?: string;
}

interface OrderManagementProps {
  onBack: () => void;
}

const statusConfig = [
  { value: "pending", label: "Pending", badge: "bg-yellow-100 text-yellow-800", metric: "text-yellow-600" },
  { value: "paid", label: "Paid", badge: "bg-emerald-100 text-emerald-800", metric: "text-emerald-600" },
  { value: "processing", label: "Processing", badge: "bg-blue-100 text-blue-800", metric: "text-blue-600" },
  { value: "shipped", label: "Shipped", badge: "bg-indigo-100 text-indigo-800", metric: "text-indigo-600" },
  { value: "delivered", label: "Delivered", badge: "bg-green-100 text-green-800", metric: "text-green-600" },
  { value: "failed", label: "Failed", badge: "bg-red-100 text-red-800", metric: "text-red-600" },
  { value: "cancelled", label: "Cancelled", badge: "bg-gray-100 text-gray-800", metric: "text-gray-600" },
  { value: "refunded", label: "Refunded", badge: "bg-amber-100 text-amber-800", metric: "text-amber-600" },
] as const;

const summaryStatuses = ["pending", "paid", "processing", "shipped", "delivered", "refunded"] as const;

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

const formatStatusLabel = (status: string) =>
  statusConfig.find((config) => config.value === status)?.label || status.replace(/-/g, " ");

export default function OrderManagement({ onBack }: OrderManagementProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const hasPanelAccess = hasAdminPanelAccess(user?.role);
  const canEdit = canEditAdminContent(user?.role);

  const fetchOrders = async (preferredReference?: string | null) => {
    try {
      const response = await fetch(apiUrl("/api/orders"), {
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch orders");
      }

      const nextOrders = Array.isArray(data.data) ? data.data : [];
      setOrders(nextOrders);
      setError(null);

      const referenceToKeep = preferredReference ?? selectedOrder?.reference ?? null;
      setSelectedOrder(
        referenceToKeep
          ? nextOrders.find((order) => order.reference === referenceToKeep) || null
          : nextOrders[0] || null
      );
    } catch (fetchError) {
      setError(getNetworkErrorMessage(fetchError, "Failed to fetch orders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPanelAccess) {
      setLoading(false);
      return;
    }

    void fetchOrders();
  }, [hasPanelAccess]);

  const updateOrderStatus = async (reference: string, newStatus: string) => {
    if (!canEdit) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/orders/${reference}/status`), {
        method: "PATCH",
        headers: getAdminRequestHeaders({ json: true }),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update order status");
      }

      await fetchOrders(reference);
    } catch (updateError) {
      setError(getNetworkErrorMessage(updateError, "Failed to update order status"));
    }
  };

  const getStatusColor = (status: string) =>
    statusConfig.find((config) => config.value === status)?.badge || "bg-gray-100 text-gray-800";

  const getSubtotalAmount = (order: Order) => order.subtotal ?? order.amount;

  const periodOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (Number.isNaN(orderDate.getTime())) {
        return false;
      }

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (orderDate < start) {
          return false;
        }
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);
        if (orderDate > end) {
          return false;
        }
      }

      return true;
    });
  }, [endDate, orders, startDate]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return periodOrders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const fullName = `${order.customerInfo.firstName} ${order.customerInfo.lastName}`.toLowerCase();

      return (
        order.reference.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query) ||
        order.customerInfo.phone.toLowerCase().includes(query) ||
        fullName.includes(query)
      );
    });
  }, [periodOrders, searchTerm, statusFilter]);

  const buildStatusMetric = (status: string) => {
    const matchingOrders = periodOrders.filter((order) => order.status === status);

    return {
      count: matchingOrders.length,
      subtotal: matchingOrders.reduce((sum, order) => sum + getSubtotalAmount(order), 0),
    };
  };

  const orderStats = {
    totalOrders: periodOrders.length,
    subtotal: periodOrders.reduce((sum, order) => sum + getSubtotalAmount(order), 0),
    statusMetrics: Object.fromEntries(
      statusConfig.map((config) => [config.value, buildStatusMetric(config.value)])
    ) as Record<string, { count: number; subtotal: number }>,
  };

  const dateRangeLabel = startDate || endDate
    ? `${startDate || "Beginning"} to ${endDate || "Today"}`
    : "All time";

  const timelineRows = selectedOrder
    ? [
        { label: "Created", value: selectedOrder.createdAt },
        { label: "Paid", value: selectedOrder.paidAt },
        { label: "Processing", value: selectedOrder.processingAt },
        { label: "Shipped", value: selectedOrder.shippedAt },
        { label: "Delivered", value: selectedOrder.deliveredAt },
        { label: "Refunded", value: selectedOrder.refundedAt },
        { label: "Cancelled", value: selectedOrder.cancelledAt },
        { label: "Inventory Reserved", value: selectedOrder.inventoryAdjustedAt },
        { label: "Inventory Restored", value: selectedOrder.inventoryRestoredAt },
        { label: "Updated", value: selectedOrder.updatedAt },
      ].filter((row) => row.value)
    : [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasPanelAccess) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">ORDER MANAGEMENT</p>
          <h1 className="mt-4 text-4xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Sign in with a backend role to review orders.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] pt-24">
      <div className="border-y border-black/10 bg-[#111] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">ORDER OPERATIONS</p>
            <h1 className="mt-3 text-4xl font-light md:text-5xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Orders Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Review performance, follow fulfillment states, and keep the order queue tidy.
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

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 py-10">
        {!canEdit && (
          <div className="mb-6 border border-[#d8c06a]/30 bg-[#fbf7ea] px-4 py-3 text-sm text-[#6f5a17]">
            You are in view-only mode. Order status changes are disabled for this role.
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              REPORTING PERIOD
            </p>
            <p className="text-[#0a0a0a] text-lg font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {dateRangeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] tracking-[0.18em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                START DATE
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] tracking-[0.18em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                END DATE
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="border border-gray-200 px-4 py-2.5 text-[11px] tracking-[0.18em] text-gray-600 hover:border-gray-400 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              CLEAR DATES
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 mb-10">
          <div className="bg-white border border-gray-100 p-4">
            <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              PERIOD TOTAL
            </h3>
            <p className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {formatCurrency(orderStats.subtotal)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{orderStats.totalOrders} orders</p>
          </div>
          {summaryStatuses.map((status) => {
            const config = statusConfig.find((item) => item.value === status)!;
            const metric = orderStats.statusMetrics[status];

            return (
              <div key={status} className="bg-white border border-gray-100 p-4">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {config.label.toUpperCase()} SUBTOTAL
                </h3>
                <p className={`text-2xl font-light ${config.metric}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatCurrency(metric.subtotal)}
                </p>
                <p className="text-xs text-gray-400 mt-1">{metric.count} {config.label.toLowerCase()} orders</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, or order ID"
            className="min-w-[280px] flex-1 border border-gray-200 px-4 py-2 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-gray-200 px-4 py-2 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <option value="all">All Orders</option>
            {statusConfig.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="border border-gray-200 px-4 py-2 text-[11px] tracking-[0.18em] text-gray-600 hover:border-gray-400 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              CLEAR SEARCH
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100">
                <h2 className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Orders ({filteredOrders.length})
                </h2>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-400" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    No orders found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.reference}
                      className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedOrder?.reference === order.reference ? "bg-[#c8a830]/5 border-l-4 border-[#c8a830]" : ""
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-3 gap-4">
                        <div>
                          <h3 className="text-[#0a0a0a] font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {order.reference}
                          </h3>
                          <p className="text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            {order.customerInfo.firstName} {order.customerInfo.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-1 rounded ${getStatusColor(order.status)}`}>
                            {formatStatusLabel(order.status).toUpperCase()}
                          </span>
                          <p className="text-[#0a0a0a] font-light mt-1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>
                            {formatCurrency(order.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            {selectedOrder ? (
              <div className="bg-white border border-gray-100 p-8 sticky top-32">
                <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Order Details
                </h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs tracking-[0.2em] text-gray-400 block mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      REFERENCE
                    </label>
                    <p className="text-[#0a0a0a] font-mono text-sm">{selectedOrder.reference}</p>
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.2em] text-gray-400 block mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      STATUS
                    </label>
                    <select
                      value={selectedOrder.status}
                      onChange={(event) => updateOrderStatus(selectedOrder.reference, event.target.value)}
                      disabled={!canEdit}
                      className="w-full border border-gray-200 px-3 py-2 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
                    >
                      {statusConfig.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.2em] text-gray-400 block mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      CUSTOMER
                    </label>
                    <p className="text-[#0a0a0a] text-sm">
                      {selectedOrder.customerInfo.firstName} {selectedOrder.customerInfo.lastName}
                    </p>
                    <p className="text-gray-400 text-xs">{selectedOrder.email}</p>
                    <p className="text-gray-400 text-xs">{selectedOrder.customerInfo.phone || "No phone number provided"}</p>
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.2em] text-gray-400 block mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      DELIVERY ADDRESS
                    </label>
                    <p className="text-[#0a0a0a] text-sm">{selectedOrder.customerInfo.address}</p>
                    <p className="text-gray-400 text-xs">
                      {selectedOrder.customerInfo.city}, {selectedOrder.customerInfo.country}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.2em] text-gray-400 block mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      ORDER SUMMARY
                    </label>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(selectedOrder.subtotal ?? selectedOrder.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Shipping</span>
                        <span>
                          {selectedOrder.shipping === 0
                            ? "FREE"
                            : formatCurrency(selectedOrder.shipping ?? 0)}
                        </span>
                      </div>
                      {selectedOrder.discountAmount ? (
                        <div className="flex items-center justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>- {formatCurrency(selectedOrder.discountAmount)}</span>
                        </div>
                      ) : null}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          TOTAL
                        </span>
                        <p className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {formatCurrency(selectedOrder.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    ITEMS ({selectedOrder.items.length})
                  </label>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-gray-50">
                        <div className="w-12 h-16 border-2 border-gray-200 overflow-hidden">
                          <img
                            src={assetUrl(item.artwork.image)}
                            alt={item.artwork.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[#0a0a0a] text-sm font-light truncate" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {item.artwork.title}
                          </h4>
                          <p className="text-xs text-gray-400">{item.artwork.artist}</p>
                          {item.artwork.frameColor ? (
                            <p className="text-xs text-gray-400">Frame: {item.artwork.frameColor}</p>
                          ) : null}
                          <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-[#0a0a0a] text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {formatCurrency(item.artwork.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p
                    className="text-xs tracking-[0.2em] text-gray-400 mb-3"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    TIMELINE
                  </p>
                  <div className="space-y-2 text-xs text-gray-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {timelineRows.length > 0 ? timelineRows.map((row) => (
                      <div key={`${row.label}-${row.value}`} className="flex items-center justify-between gap-4">
                        <span>{row.label}</span>
                        <span>{new Date(row.value as string).toLocaleString()}</span>
                      </div>
                    )) : (
                      <p>No lifecycle updates recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 p-8 text-center">
                <div className="text-gray-200 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-400" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Select an order to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
