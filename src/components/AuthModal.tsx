import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { hasAdminPanelAccess } from "../lib/admin";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register" | "forgot-password";
  onAuthSuccess?: (destination: "profile" | "admin") => void;
}

export default function AuthModal({ isOpen, onClose, initialMode = "login", onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot-password" | "reset-password">(initialMode);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    resetToken: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { login, register, forgotPassword, resetPassword } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let result;

      switch (mode) {
        case "login":
          result = await login(formData.email, formData.password);
          break;

        case "register":
          if (formData.password !== formData.confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match" });
            setLoading(false);
            return;
          }
          if (formData.password.length < 8) {
            setMessage({ type: "error", text: "Password must be at least 8 characters long" });
            setLoading(false);
            return;
          }
          result = await register(formData.email, formData.password, formData.firstName, formData.lastName);
          break;

        case "forgot-password":
          result = await forgotPassword(formData.email);
          break;

        case "reset-password":
          if (formData.password !== formData.confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match" });
            setLoading(false);
            return;
          }
          if (formData.password.length < 8) {
            setMessage({ type: "error", text: "Password must be at least 8 characters long" });
            setLoading(false);
            return;
          }
          result = await resetPassword(formData.resetToken, formData.password);
          break;
      }

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        if (mode === "login" || mode === "register") {
          setTimeout(() => {
            onAuthSuccess?.(hasAdminPanelAccess(result.user?.role) ? "admin" : "profile");
            onClose();
            setFormData({
              email: "",
              password: "",
              confirmPassword: "",
              firstName: "",
              lastName: "",
              resetToken: ""
            });
          }, 1500);
        }
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      resetToken: ""
    });
    setMessage(null);
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    resetForm();
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
        <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2
              className="text-2xl font-light text-[#0a0a0a]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {mode === "login" && "Welcome Back"}
              {mode === "register" && "Create Account"}
              {mode === "forgot-password" && "Reset Password"}
              {mode === "reset-password" && "Set New Password"}
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
            {/* Message */}
            {message && (
              <div className={`mb-6 p-4 rounded ${
                message.type === "success" 
                  ? "bg-green-50 border border-green-200 text-green-700" 
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                {message.text}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name fields for registration */}
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      FIRST NAME *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      LAST NAME *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                  placeholder="your@email.com"
                  required
                />
              </div>

              {/* Reset token for reset password */}
              {mode === "reset-password" && (
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    RESET TOKEN *
                  </label>
                  <input
                    type="text"
                    value={formData.resetToken}
                    onChange={(e) => handleInputChange("resetToken", e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="Enter reset token"
                    required
                  />
                </div>
              )}

              {/* Password */}
              {mode !== "forgot-password" && (
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {mode === "reset-password" ? "NEW PASSWORD *" : "PASSWORD *"}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
              )}

              {/* Confirm Password */}
              {(mode === "register" || mode === "reset-password") && (
                <div>
                  <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    CONFIRM PASSWORD *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 text-sm tracking-[0.2em] font-medium transition-all duration-300 ${
                  loading
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-[#0a0a0a] text-white hover:bg-[#c8a830]"
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {loading ? "PROCESSING..." : (
                  <>
                    {mode === "login" && "SIGN IN"}
                    {mode === "register" && "CREATE ACCOUNT"}
                    {mode === "forgot-password" && "SEND RESET LINK"}
                    {mode === "reset-password" && "RESET PASSWORD"}
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center space-y-3">
              {mode === "login" && (
                <>
                  <button
                    onClick={() => switchMode("forgot-password")}
                    className="text-xs text-[#c8a830] hover:underline tracking-wider"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    FORGOT YOUR PASSWORD?
                  </button>
                  <div className="text-gray-400 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Don't have an account?{" "}
                    <button
                      onClick={() => switchMode("register")}
                      className="text-[#c8a830] hover:underline"
                    >
                      Sign up
                    </button>
                  </div>
                </>
              )}

              {mode === "register" && (
                <div className="text-gray-400 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Already have an account?{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="text-[#c8a830] hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              )}

              {mode === "forgot-password" && (
                <div className="text-gray-400 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Remember your password?{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="text-[#c8a830] hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              )}

              {mode === "reset-password" && (
                <div className="text-gray-400 text-xs" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <button
                    onClick={() => switchMode("login")}
                    className="text-[#c8a830] hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              )}
            </div>

            {/* Social Login Placeholder */}
            {mode === "login" && (
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400 text-xs tracking-wider" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      OR CONTINUE WITH
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 border border-gray-200 py-3 text-xs tracking-wider text-gray-600 hover:border-gray-400 transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    GOOGLE
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 border border-gray-200 py-3 text-xs tracking-wider text-gray-600 hover:border-gray-400 transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    FACEBOOK
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
