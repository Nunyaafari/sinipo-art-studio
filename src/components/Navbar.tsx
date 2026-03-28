import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { hasAdminPanelAccess } from "../lib/admin";
import signatureLogo from "../../sinipo logo/signature only.svg";

interface NavbarProps {
  cartCount: number;
  onCartOpen: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ cartCount, onCartOpen, activePage, onNavigate }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Shop", page: "shop" },
    { label: "Collections", page: "collections" },
    { label: "About", page: "about" },
  ];

  const iconColor = scrolled || activePage !== "home" ? "text-[#333]" : "text-white";
  const accountDestination = hasAdminPanelAccess(user?.role) ? "admin" : "profile";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <div
        className="bg-[#0a0a0a] text-white text-center py-2 text-xs tracking-[0.15em] font-light"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        WORLDWIDE SHIPPING AVAILABLE · CERTIFICATE OF AUTHENTICITY INCLUDED
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between h-20">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-3 group"
        >
          <div className="relative h-12 w-28 sm:h-14 sm:w-32">
            <img
              src={signatureLogo}
              alt="Sinipo signature logo"
              className="w-full h-full object-contain"
            />
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => onNavigate(link.page)}
              className={`text-sm tracking-[0.12em] font-light transition-all duration-200 relative group ${
                iconColor
              } ${activePage === link.page ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {link.label.toUpperCase()}
              <span
                className={`absolute -bottom-1 left-0 h-px bg-[#c8a830] transition-all duration-300 ${
                  activePage === link.page ? "w-full" : "w-0 group-hover:w-full"
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <button
            className={`hidden lg:block transition-colors duration-200 hover:text-[#c8a830] ${iconColor}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            className={`hidden lg:block transition-colors duration-200 hover:text-[#c8a830] ${iconColor}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          <div className="hidden lg:block relative">
            <button
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className={`transition-colors duration-200 hover:text-[#c8a830] ${iconColor}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a8.25 8.25 0 0114.998 0" />
              </svg>
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 mt-4 w-72 bg-white border border-gray-100 shadow-xl p-4">
                {isAuthenticated ? (
                  <>
                    <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      MY ACCOUNT
                    </p>
                    <p className="text-base text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">{user?.email}</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          onNavigate(accountDestination);
                          setAccountMenuOpen(false);
                        }}
                        className="w-full text-left border border-gray-200 px-4 py-3 text-xs tracking-[0.16em] text-gray-700 hover:border-[#c8a830] hover:text-[#c8a830] transition-colors"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        MY ORDERS & CRM
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          setAccountMenuOpen(false);
                        }}
                        className="w-full text-left border border-gray-200 px-4 py-3 text-xs tracking-[0.16em] text-gray-700 hover:border-red-300 hover:text-red-500 transition-colors"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        SIGN OUT
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      CUSTOMER CRM
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Sign in to track orders, save addresses, manage payment methods, and view certificates.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          onNavigate("login");
                          setAccountMenuOpen(false);
                        }}
                        className="w-full bg-[#0a0a0a] text-white px-4 py-3 text-xs tracking-[0.18em] hover:bg-[#c8a830] transition-colors"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        SIGN IN
                      </button>
                      <button
                        onClick={() => {
                          onNavigate("register");
                          setAccountMenuOpen(false);
                        }}
                        className="w-full border border-gray-200 px-4 py-3 text-xs tracking-[0.18em] text-gray-700 hover:border-[#c8a830] hover:text-[#c8a830] transition-colors"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        CREATE ACCOUNT
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onCartOpen}
            className={`relative transition-colors duration-200 hover:text-[#c8a830] ${iconColor}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#c8a830] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`lg:hidden transition-colors duration-200 ${iconColor}`}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-6 py-6 flex flex-col gap-5">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => {
                  onNavigate(link.page);
                  setMenuOpen(false);
                }}
                className="text-left text-sm tracking-[0.12em] text-[#333] hover:text-[#c8a830] transition-colors"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {link.label.toUpperCase()}
              </button>
            ))}

            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      onNavigate(accountDestination);
                      setMenuOpen(false);
                    }}
                    className="text-left text-sm tracking-[0.12em] text-[#333] hover:text-[#c8a830] transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    MY ACCOUNT
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="text-left text-sm tracking-[0.12em] text-[#333] hover:text-red-500 transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    SIGN OUT
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onNavigate("login");
                      setMenuOpen(false);
                    }}
                    className="text-left text-sm tracking-[0.12em] text-[#333] hover:text-[#c8a830] transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    SIGN IN
                  </button>
                  <button
                    onClick={() => {
                      onNavigate("register");
                      setMenuOpen(false);
                    }}
                    className="text-left text-sm tracking-[0.12em] text-[#333] hover:text-[#c8a830] transition-colors"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    CREATE ACCOUNT
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
