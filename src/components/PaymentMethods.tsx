import { useState, useEffect } from "react";
import { apiUrl, getNetworkErrorMessage } from "../lib/api";

interface PaymentMethod {
  id: number;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName?: string;
  isDefault: boolean;
  createdAt: string;
}

interface PaymentMethodsProps {
  onBack: () => void;
}

export default function PaymentMethods({ onBack }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cardholderName: ""
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem('authToken');
  const API_BASE = apiUrl('/api/payment-methods');

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(API_BASE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPaymentMethods(data.data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      setError(getNetworkErrorMessage(error, 'Failed to load payment methods'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    handleInputChange('cardNumber', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'card',
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          expiryMonth: formData.expiryMonth,
          expiryYear: formData.expiryYear,
          cvv: formData.cvv,
          cardholderName: formData.cardholderName
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchPaymentMethods();
        setShowAddForm(false);
        setFormData({
          cardNumber: "",
          expiryMonth: "",
          expiryYear: "",
          cvv: "",
          cardholderName: ""
        });
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to add payment method:', error);
      setError(getNetworkErrorMessage(error, 'Failed to add payment method'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/${id}/default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        await fetchPaymentMethods();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      setError(getNetworkErrorMessage(error, 'Failed to update default payment method'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        await fetchPaymentMethods();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      setError(getNetworkErrorMessage(error, 'Failed to delete payment method'));
    }
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return (
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#1A1F71">
            <path d="M9.112 8.262L5.97 15.758H3.92L2.393 9.25c-.094-.368-.175-.503-.461-.658C1.413 8.313.888 8.083.25 7.98l.046-.218h3.32c.433 0 .82.303.91.728l.834 4.428 2.066-5.156h2.686zm8.207 4.063c.006-1.557-2.167-1.643-2.15-2.356.005-.222.214-.46.668-.523.224-.031.84-.055 1.535.178l.272-1.272c-.363-.13-.826-.268-1.4-.276-1.488 0-2.535.788-2.542 1.91-.006.8.713 1.248 1.258 1.518.56.276.748.453.744.705-.004.38-.45.55-.87.555-.732.006-1.16-.198-1.503-.357l-.275 1.287c.353.163.998.305 1.666.312 1.583 0 2.615-.778 2.622-1.984zm4.98.738h-1.49c-.462 0-.838-.154-1.048-.68L17.67 8.262h2.12l1.357 3.568 1.32-3.568h2.07l-2.248 6.8zm-7.607-5.01L9.37 8.262h2.04l1.78 6.496h-2.1l-.28-.89H8.6l-.54 1.138H5.84l2.05-6.744h.302zm-5.29 5.01H2.93l-.31-1.558H.35l-.31 1.558H-.99l2.24-6.8h2.12l2.24 6.8zm-.79-2.23l-.78-3.94-.27 3.94h1.05z"/>
          </svg>
        );
      case 'mastercard':
        return (
          <svg className="w-8 h-8" viewBox="0 0 24 24">
            <circle cx="9" cy="12" r="6" fill="#EB001B"/>
            <circle cx="15" cy="12" r="6" fill="#F79E1B"/>
            <path d="M12 6.5a6 6 0 010 11" fill="#FF5F00"/>
          </svg>
        );
      case 'american express':
        return (
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#006FCF">
            <path d="M2 6h20v12H2V6zm1 1v10h18V7H3z"/>
            <path d="M5 10h2v4H5v-4zm4 0h6v1H9v-1zm0 2h6v1H9v-1zm0 2h4v1H9v-1z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment methods...</p>
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
          PAYMENT METHODS
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Saved Cards
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
          BACK TO PROFILE
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Add Payment Method Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-[#0a0a0a] text-white px-6 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            + ADD NEW CARD
          </button>
        </div>

        {/* Add Payment Method Form */}
        {showAddForm && (
          <div className="bg-white border border-gray-100 p-8 mb-8">
            <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Add New Card
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  CARD NUMBER *
                </label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    EXPIRY MONTH *
                  </label>
                  <select
                    value={formData.expiryMonth}
                    onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none bg-white"
                    required
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    EXPIRY YEAR *
                  </label>
                  <select
                    value={formData.expiryYear}
                    onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none bg-white"
                    required
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    CVV *
                  </label>
                  <input
                    type="text"
                    value={formData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    CARDHOLDER NAME
                  </label>
                  <input
                    type="text"
                    value={formData.cardholderName}
                    onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                    placeholder="John Doe"
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-[#0a0a0a] text-white px-8 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {formLoading ? "ADDING..." : "ADD CARD"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      cardNumber: "",
                      expiryMonth: "",
                      expiryYear: "",
                      cvv: "",
                      cardholderName: ""
                    });
                  }}
                  className="border border-gray-200 text-gray-600 px-8 py-3 text-xs tracking-[0.2em] hover:border-gray-400 transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment Methods List */}
        <div className="bg-white border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Saved Cards ({paymentMethods.length})
            </h2>
          </div>
          
          {paymentMethods.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-200 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                No payment methods saved
              </p>
              <p className="text-gray-300 text-sm mt-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Add a card to make checkout faster
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {paymentMethods.map((method) => (
                <div key={method.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-gray-400">
                        {getCardIcon(method.brand)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[#0a0a0a] font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {method.brand} •••• {method.last4}
                          </h3>
                          {method.isDefault && (
                            <span className="text-[10px] bg-[#c8a830] text-white px-2 py-1 rounded">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                          {method.cardholderName && ` • ${method.cardholderName}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          className="text-xs text-[#c8a830] hover:underline"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          SET DEFAULT
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(method.id)}
                        className="text-xs text-red-500 hover:underline ml-4"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
