import { useEffect, useRef, useState } from "react";
import type { Product } from "../data/products";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { validateCheckoutPayload } from "../lib/formValidation";

interface CartItem {
  id: string;
  artwork: Product;
  quantity: number;
}

interface CheckoutPageProps {
  items: CartItem[];
  onBack: () => void;
  onSuccess: (reference: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}

interface DiscountInfo {
  code: string;
  type: string;
  value: number;
  discountAmount: number;
  minOrderAmount: number;
  maxDiscount: number;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

interface ShippingConfig {
  currency: string;
  freeShippingThreshold: number;
  standardShippingCost: number;
  shippingLabel: string;
  estimatedDelivery: string;
}

interface TaxConfig {
  enabled: boolean;
  taxRate: number;
  taxLabel: string;
}

interface PaymentConfig {
  paymentMode: "live" | "test";
  providerName: string;
  guestCheckoutEnabled: boolean;
  checkoutNotice: string;
}

export default function CheckoutPage({ items, onBack, onSuccess, onUpdateQty }: CheckoutPageProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Nigeria"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInfo | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>({
    currency: "USD",
    freeShippingThreshold: 500,
    standardShippingCost: 50,
    shippingLabel: "Standard delivery",
    estimatedDelivery: "3-5 business days"
  });
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({
    enabled: false,
    taxRate: 0,
    taxLabel: "Sales tax"
  });
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    paymentMode: "live",
    providerName: "Paystack",
    guestCheckoutEnabled: true,
    checkoutNotice: "All payments are securely processed and confirmed before fulfillment begins."
  });
  const paymentActionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCustomerInfo((prev) => ({
      firstName: prev.firstName || user?.firstName || "",
      lastName: prev.lastName || user?.lastName || "",
      email: prev.email || user?.email || "",
      phone: prev.phone || user?.phone || "",
      address: prev.address || user?.address || "",
      city: prev.city || user?.city || "",
      country: prev.country || user?.country || "Nigeria"
    }));
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const loadStorefrontConfig = async () => {
      try {
        const response = await fetch(apiUrl("/api/shopping/config"));
        const data = await response.json();

        if (!cancelled && response.ok && data.success) {
          if (data.data?.shipping) {
            setShippingConfig(data.data.shipping);
          }
          if (data.data?.tax) {
            setTaxConfig(data.data.tax);
          }
          if (data.data?.payment) {
            setPaymentConfig(data.data.payment);
          }
        }
      } catch (configError) {
        console.error("Failed to load storefront config:", configError);
      }
    };

    void loadStorefrontConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.artwork.price * item.quantity, 0);
  const shipping =
    subtotal >= shippingConfig.freeShippingThreshold ? 0 : shippingConfig.standardShippingCost;
  const discountAmount = appliedDiscount ? appliedDiscount.discountAmount : 0;
  const taxableSubtotal = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxConfig.enabled ? Number((taxableSubtotal * (taxConfig.taxRate / 100)).toFixed(2)) : 0;
  const total = taxableSubtotal + shipping + taxAmount;
  const formatMoney = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: shippingConfig.currency || "USD",
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const revealPaymentError = (message: string) => {
    setError(message);
    paymentActionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validateForm = (): boolean => {
    const validationError = validateCheckoutPayload(customerInfo, items.length);

    if (validationError) {
      revealPaymentError(validationError);
      return false;
    }

    setError(null);
    return true;
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code");
      return;
    }

    setDiscountLoading(true);
    setDiscountError(null);

    try {
      const response = await fetch(apiUrl('/api/admin/discounts/validate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: discountCode,
          orderAmount: subtotal
        }),
      });

      const data = await response.json();

      if (!data.valid) {
        throw new Error(data.error || 'Invalid discount code');
      }

      setAppliedDiscount(data.data);
      setDiscountError(null);
    } catch (err) {
      console.error('Discount validation error:', err);
      setDiscountError(getNetworkErrorMessage(err, 'Failed to apply discount code'));
      setAppliedDiscount(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError(null);
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    if (!isAuthenticated && !paymentConfig.guestCheckoutEnabled) {
      revealPaymentError("Please sign in to complete checkout.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize payment with backend
      const response = await fetch(apiUrl('/api/payment/initialize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: customerInfo.email,
          amount: total,
          items: items,
          customerInfo: customerInfo,
          discountCode: appliedDiscount?.code || null,
          discountAmount: discountAmount,
          shipping
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.data?.authorization_url) {
        throw new Error(data.message || data.error || 'Failed to initialize payment');
      }

      // Redirect to Paystack payment page
      window.location.href = data.data.authorization_url;

    } catch (err) {
      console.error('Payment error:', err);
      setError(getNetworkErrorMessage(err, 'Payment failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <div
          className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          SECURE CHECKOUT
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Complete Your Order
        </h1>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left - Customer Information */}
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs tracking-[0.15em] text-gray-600 hover:text-[#c8a830] transition-colors mb-8"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              BACK TO CART
            </button>

            <h2
              className="text-2xl font-light text-[#0a0a0a] mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Customer Information
            </h2>

            <div className="bg-white border border-gray-100 px-5 py-4 mb-6">
              <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                CUSTOMER ACCOUNT
              </p>
              <p className="text-sm text-gray-700">
                {isAuthenticated
                  ? `Signed in as ${user?.email}. This order will be saved to your account and appear in My Orders.`
                  : paymentConfig.guestCheckoutEnabled
                    ? "Guest checkout is enabled. Sign in from the account menu to save orders, addresses, payment methods, and loyalty activity to your profile."
                    : "Guest checkout is currently disabled. Sign in to continue so your order can be attached to your customer account."}
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    FIRST NAME *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    LAST NAME *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  PHONE NUMBER *
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  DELIVERY ADDRESS *
                </label>
                <textarea
                  value={customerInfo.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors resize-none"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  rows={3}
                  placeholder="Enter your full delivery address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    CITY *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="Lagos"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    COUNTRY
                  </label>
                  <select
                    value={customerInfo.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors bg-white"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    <option value="Nigeria">Nigeria</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Kenya">Kenya</option>
                    <option value="South Africa">South Africa</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Order Summary */}
          <div>
            <div className="bg-white border border-gray-100 p-8 sticky top-32">
              <h2
                className="text-2xl font-light text-[#0a0a0a] mb-8"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-8">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-50">
                    <div className="w-16 h-20 shrink-0 border-4 border-gray-200 overflow-hidden">
                      <img
                        src={assetUrl(item.artwork.image)}
                        alt={item.artwork.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-[#0a0a0a] font-light text-sm leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        {item.artwork.title}
                      </h3>
                      <p
                        className="text-gray-400 text-xs tracking-wider mt-0.5"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {item.artwork.artist}
                      </p>
                      <p
                        className="text-gray-300 text-[10px] tracking-wider mt-0.5"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {item.artwork.productType === "fashion"
                          ? `${item.artwork.clothingSize || item.artwork.size} · ${item.artwork.color || item.artwork.material || "Fashion"}${item.artwork.sku ? ` · ${item.artwork.sku}` : ""}`
                          : `${item.artwork.frameColor} Frame · ${item.artwork.dimensions}`}
                      </p>
                      <div className="mt-3 inline-flex items-center border border-gray-200">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        >
                          −
                        </button>
                        <span
                          className="w-8 text-center text-xs"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                          disabled={item.artwork.inStock === false || item.quantity >= item.artwork.stockQuantity}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <span
                      className="text-[#0a0a0a] font-light text-sm"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {formatMoney(item.artwork.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Discount Code */}
              <div className="mb-6">
                <label
                  className="text-xs tracking-[0.2em] text-gray-400 block mb-2"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  DISCOUNT CODE
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 border border-gray-200 px-3 py-2 text-sm focus:border-[#c8a830] focus:outline-none"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    disabled={!!appliedDiscount}
                  />
                  {appliedDiscount ? (
                    <button
                      onClick={handleRemoveDiscount}
                      className="px-4 py-2 text-xs tracking-[0.1em] text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      REMOVE
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyDiscount}
                      disabled={discountLoading}
                      className="px-4 py-2 text-xs tracking-[0.1em] bg-[#0a0a0a] text-white hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {discountLoading ? "..." : "APPLY"}
                    </button>
                  )}
                </div>
                {discountError && (
                  <p className="text-red-500 text-xs mt-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {discountError}
                  </p>
                )}
                {appliedDiscount && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200">
                    <p className="text-green-700 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      ✓ Code "{appliedDiscount.code}" applied - ${appliedDiscount.discountAmount} discount
                    </p>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs text-gray-400 tracking-[0.2em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    SUBTOTAL
                  </span>
                  <span
                      className="text-[#0a0a0a] font-light"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                  >
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs text-gray-400 tracking-[0.2em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {shippingConfig.shippingLabel.toUpperCase()}
                  </span>
                  <span
                      className="text-[#0a0a0a] font-light"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                  >
                    {shipping === 0 ? "FREE" : formatMoney(shipping)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs text-gray-400 tracking-[0.2em]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    DELIVERY
                  </span>
                  <span
                    className="text-[#0a0a0a] font-light"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                  >
                    {shippingConfig.estimatedDelivery}
                  </span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs text-gray-400 tracking-[0.2em]"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      DISCOUNT ({appliedDiscount.code})
                    </span>
                    <span
                      className="text-green-600 font-light"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                    >
                      -{formatMoney(discountAmount)}
                    </span>
                  </div>
                )}
                {taxConfig.enabled && (
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs text-gray-400 tracking-[0.2em]"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {taxConfig.taxLabel.toUpperCase()}
                    </span>
                    <span
                      className="text-[#0a0a0a] font-light"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                    >
                      {formatMoney(taxAmount)}
                    </span>
                  </div>
                )}
                {subtotal >= shippingConfig.freeShippingThreshold && (
                  <p
                    className="text-[#c8a830] text-xs tracking-wider"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    ✓ FREE SHIPPING INCLUDED
                  </p>
                )}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs text-gray-400 tracking-[0.2em]"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      TOTAL
                    </span>
                    <span
                      className="text-2xl font-light text-[#0a0a0a]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {formatMoney(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <div ref={paymentActionRef}>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className={`w-full py-4 text-sm tracking-[0.2em] font-medium transition-all duration-300 ${
                    loading
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-[#0a0a0a] text-white hover:bg-[#c8a830]"
                  }`}
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {loading ? "PROCESSING..." : `PAY ${formatMoney(total)}`}
                </button>

                {error && (
                  <div className="mt-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-4 border border-gray-100 bg-[#fafaf8] px-4 py-3">
                <p
                  className="text-[11px] tracking-[0.18em] text-gray-400 mb-1"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  PAYMENT SETTINGS
                </p>
                <p className="text-sm text-gray-700">
                  {paymentConfig.providerName} is running in{" "}
                  <span className="font-medium uppercase">
                    {paymentConfig.paymentMode}
                  </span>{" "}
                  mode. {paymentConfig.checkoutNotice}
                </p>
              </div>

              {/* Security badges */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-4 text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>SSL Secured</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      {paymentConfig.providerName} Protected
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Free shipping starts at {formatMoney(shippingConfig.freeShippingThreshold)}.{" "}
                  {taxConfig.enabled
                    ? `${taxConfig.taxLabel} is applied at ${taxConfig.taxRate}% during checkout. `
                    : ""}
                  Your payment is securely processed through {paymentConfig.providerName}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
