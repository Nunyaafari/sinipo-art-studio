import { useState, useEffect } from "react";
import { apiUrl, getNetworkErrorMessage } from "../lib/api";

interface AnalyticsData {
  period: string;
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    totalConversions: number;
    totalRevenue: number;
    conversionRate: number;
    paidRevenue: number;
    deliveredRevenue: number;
    lowStockProducts: number;
    stockMovements: number;
  };
  topPages: Array<{ page: string; views: number }>;
  topProducts: Array<{ productId: number; title: string; unitsSold: number; orders: number; revenue: number }>;
  conversionTypes: Record<string, number>;
  revenueByStatus: Record<string, number>;
  inventorySnapshot: {
    totalProducts: number;
    lowStockProducts: Array<{ id: number; title: string; stockQuantity: number }>;
    recentMovements: Array<{
      id: string;
      productTitle: string;
      variantLabel?: string | null;
      quantityDelta: number;
      reason: string;
      createdAt: string;
    }>;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    value: number;
    timestamp: string;
  }>;
  totalEvents: number;
}

interface SalesReport {
  period: {
    startDate: string;
    endDate: string;
  };
  groupBy: string;
  salesReport: Array<{
    period: string;
    sales: number;
    revenue: number;
    orders: number;
  }>;
  totals: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  topProducts: Array<{ productId: number; title: string; unitsSold: number; revenue: number }>;
  stockMovement: Array<{
    id: string;
    productTitle: string;
    variantLabel?: string | null;
    quantityDelta: number;
    previousQuantity: number;
    nextQuantity: number;
    reason: string;
    createdAt: string;
  }>;
}

interface AnalyticsDashboardProps {
  onBack: () => void;
}

export default function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("7d");
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem('authToken');
  const API_BASE = apiUrl('/api/analytics');

  useEffect(() => {
    fetchAnalyticsData();
    fetchSalesReport();
  }, [period]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError(getNetworkErrorMessage(error, 'Failed to load analytics data'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    try {
      const response = await fetch(`${API_BASE}/sales-report?groupBy=day`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSalesReport(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sales report:', error);
      setError(getNetworkErrorMessage(error, 'Failed to load sales report'));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
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
          ANALYTICS DASHBOARD
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Sales & Analytics
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
          BACK TO DASHBOARD
        </button>

        {/* Period Selector */}
        <div className="flex gap-2 mb-8">
          {[
            { id: "24h", label: "24 Hours" },
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 text-xs tracking-[0.15em] transition-all ${
                period === p.id
                  ? "bg-[#0a0a0a] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 pb-4">
          {[
            { id: "overview", label: "Overview" },
            { id: "sales", label: "Sales Report" },
            { id: "behavior", label: "User Behavior" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs tracking-[0.15em] transition-all ${
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

        {/* Overview Tab */}
        {activeTab === "overview" && analyticsData && (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  PAGE VIEWS
                </h3>
                <p className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatNumber(analyticsData.summary.totalPageViews)}
                </p>
              </div>
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  UNIQUE VISITORS
                </h3>
                <p className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatNumber(analyticsData.summary.uniqueVisitors)}
                </p>
              </div>
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  CONVERSIONS
                </h3>
                <p className="text-3xl font-light text-[#c8a830]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatNumber(analyticsData.summary.totalConversions)}
                </p>
              </div>
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  REVENUE
                </h3>
                <p className="text-3xl font-light text-green-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatCurrency(analyticsData.summary.totalRevenue)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  PAID REVENUE
                </h3>
                <p className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatCurrency(analyticsData.summary.paidRevenue)}
                </p>
              </div>
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  DELIVERED REVENUE
                </h3>
                <p className="text-3xl font-light text-[#c8a830]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatCurrency(analyticsData.summary.deliveredRevenue)}
                </p>
              </div>
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  STOCK MOVEMENTS
                </h3>
                <p className="text-3xl font-light text-red-500" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {formatNumber(analyticsData.summary.stockMovements)}
                </p>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white border border-gray-100 p-6 mb-8">
              <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                CONVERSION RATE
              </h3>
              <div className="flex items-center gap-4">
                <p className="text-4xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {analyticsData.summary.conversionRate}%
                </p>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#c8a830] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(analyticsData.summary.conversionRate * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Top Pages */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                TOP PAGES
              </h3>
              <div className="space-y-3">
                {analyticsData.topPages.slice(0, 5).map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate flex-1">{page.page}</span>
                    <span className="text-sm font-medium text-[#0a0a0a] ml-4">{page.views}</span>
                  </div>
                ))}
              </div>
              </div>
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  TOP PRODUCTS
                </h3>
                <div className="space-y-3">
                  {analyticsData.topProducts.slice(0, 5).map((product) => (
                    <div key={product.productId} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-700">{product.title}</p>
                        <p className="text-xs text-gray-400">{product.unitsSold} units · {product.orders} orders</p>
                      </div>
                      <span className="text-sm font-medium text-[#0a0a0a]">{formatCurrency(product.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                RECENT ACTIVITY
              </h3>
              <div className="space-y-3">
                {analyticsData.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600">{activity.description}</span>
                      <p className="text-xs text-gray-400">{formatDate(activity.timestamp)}</p>
                    </div>
                    {activity.value > 0 && (
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(activity.value)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              </div>
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  LOW STOCK WATCHLIST
                </h3>
                <div className="space-y-3">
                  {analyticsData.inventorySnapshot.lowStockProducts.length > 0 ? (
                    analyticsData.inventorySnapshot.lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{product.title}</span>
                        <span className="text-sm font-medium text-red-500">{product.stockQuantity} left</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No products are currently below the low-stock threshold.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Report Tab */}
        {activeTab === "sales" && salesReport && (
          <div>
            <div className="bg-white border border-gray-100 p-6 mb-8">
              <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                SALES SUMMARY
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Sales</p>
                  <p className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {formatNumber(salesReport.totals.totalSales)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-2xl font-light text-green-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {formatCurrency(salesReport.totals.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Average Order</p>
                  <p className="text-2xl font-light text-[#c8a830]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {formatCurrency(salesReport.totals.averageOrderValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-6">
              <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                SALES BY PERIOD
              </h3>
              <div className="space-y-3">
                {salesReport.salesReport.slice(0, 10).map((sale, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">{sale.period}</span>
                    <div className="flex gap-6">
                      <span className="text-sm text-gray-600">{sale.orders} orders</span>
                      <span className="text-sm font-medium text-[#0a0a0a]">{formatCurrency(sale.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  TOP PRODUCTS
                </h3>
                <div className="space-y-3">
                  {salesReport.topProducts.slice(0, 8).map((product) => (
                    <div key={product.productId} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-700">{product.title}</p>
                        <p className="text-xs text-gray-400">{product.unitsSold} units sold</p>
                      </div>
                      <span className="text-sm font-medium text-[#0a0a0a]">{formatCurrency(product.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  STOCK MOVEMENT
                </h3>
                <div className="space-y-3">
                  {salesReport.stockMovement.slice(0, 8).map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-700">
                          {movement.productTitle}
                          {movement.variantLabel ? ` · ${movement.variantLabel}` : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                          {movement.reason.replace(/_/g, " ")} · {formatDate(movement.createdAt)}
                        </p>
                      </div>
                      <span className={`text-sm font-medium ${movement.quantityDelta < 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {movement.quantityDelta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Behavior Tab */}
        {activeTab === "behavior" && (
          <div className="bg-white border border-gray-100 p-6">
            <h3 className="text-sm tracking-[0.2em] text-gray-400 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              USER BEHAVIOR INSIGHTS
            </h3>
            <p className="text-gray-600" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              User behavior tracking is active. View individual user journeys through the admin panel.
            </p>
            <div className="mt-6 p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-[#0a0a0a] mb-2">Tracked Events</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Page views and navigation</li>
                <li>• Product interactions</li>
                <li>• Cart additions and removals</li>
                <li>• Search queries</li>
                <li>• Social shares</li>
                <li>• Purchase completions</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
