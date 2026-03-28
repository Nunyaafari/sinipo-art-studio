import { useState, useEffect } from "react";
import { apiUrl, getNetworkErrorMessage } from "../lib/api";

interface PaymentCallbackProps {
  onNavigate: (page: string) => void;
}

interface PaymentResult {
  reference: string;
  status: string;
  amount: number;
  paid_at?: string;
  customer?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export default function PaymentCallback({ onNavigate }: PaymentCallbackProps) {
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const leaveCallbackPage = (page: string) => {
    window.history.replaceState({}, "", "/");
    onNavigate(page);
  };

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get reference from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const reference = urlParams.get('reference');

        if (!reference) {
          throw new Error('Payment reference not found');
        }

        // Verify payment with backend. Signed-in orders are user-scoped,
        // so include the token when present while still supporting guests.
        const token = localStorage.getItem("authToken");
        const response = await fetch(apiUrl(`/api/payment/verify/${reference}`), {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Payment verification failed');
        }

        setPaymentResult(data.data);
      } catch (err) {
        console.error('Payment verification error:', err);
        setError(getNetworkErrorMessage(err, 'Payment verification failed'));
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p
            className="text-gray-600 text-lg"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Verifying your payment...
          </p>
          <p
            className="text-gray-400 text-sm mt-2"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Please wait while we confirm your transaction
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="bg-white border border-gray-100 p-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1
              className="text-3xl font-light text-[#0a0a0a] mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Payment Verification Failed
            </h1>
            <p
              className="text-gray-600 mb-8"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {error}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => leaveCallbackPage('shop')}
                className="bg-[#0a0a0a] text-white px-8 py-3 text-sm tracking-[0.2em] hover:bg-[#c8a830] transition-colors"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                CONTINUE SHOPPING
              </button>
              <button
                onClick={() => leaveCallbackPage('home')}
                className="border border-gray-200 text-gray-600 px-8 py-3 text-sm tracking-[0.2em] hover:border-gray-400 transition-colors"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                GO TO HOME
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = paymentResult?.status === 'success';

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="bg-white border border-gray-100 p-12">
          {/* Status Icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isSuccess ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {isSuccess ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>

          {/* Status Title */}
          <h1
            className="text-3xl font-light text-[#0a0a0a] mb-4"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {isSuccess ? 'Payment Successful!' : 'Payment Pending'}
          </h1>

          {/* Status Message */}
          <p
            className="text-gray-600 mb-6"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {isSuccess 
              ? 'Thank you for your purchase! Your order has been confirmed.'
              : 'Your payment is being processed. We will confirm once it\'s complete.'
            }
          </p>

          {/* Payment Details */}
          {paymentResult && (
            <div className="bg-gray-50 p-6 mb-8 text-left">
              <h3
                className="text-sm tracking-[0.2em] text-gray-400 mb-4"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                PAYMENT DETAILS
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Reference:</span>
                  <span className="text-[#0a0a0a] text-sm font-mono">{paymentResult.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Amount:</span>
                  <span className="text-[#0a0a0a] text-sm">${paymentResult.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Status:</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    isSuccess ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {paymentResult.status?.toUpperCase()}
                  </span>
                </div>
                {paymentResult.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Paid At:</span>
                    <span className="text-[#0a0a0a] text-sm">
                      {new Date(paymentResult.paid_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {isSuccess && (
            <div className="bg-[#c8a830]/10 p-6 mb-8">
              <h3
                className="text-sm tracking-[0.2em] text-[#c8a830] mb-3"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                WHAT'S NEXT?
              </h3>
              <ul className="text-left text-gray-600 text-sm space-y-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <li>• You will receive an email confirmation shortly</li>
                <li>• Your artwork will be carefully packaged and shipped</li>
                <li>• Tracking information will be sent to your email</li>
                <li>• Certificate of authenticity included with your order</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => leaveCallbackPage('shop')}
              className="bg-[#0a0a0a] text-white px-8 py-3 text-sm tracking-[0.2em] hover:bg-[#c8a830] transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              CONTINUE SHOPPING
            </button>
            <button
              onClick={() => leaveCallbackPage('home')}
              className="border border-gray-200 text-gray-600 px-8 py-3 text-sm tracking-[0.2em] hover:border-gray-400 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              GO TO HOME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
