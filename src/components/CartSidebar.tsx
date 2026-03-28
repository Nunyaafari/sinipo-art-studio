import type { Product } from "../data/products";
import { assetUrl } from "../lib/api";

interface CartItem {
  id: string;
  artwork: Product;
  quantity: number;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onCheckout: () => void;
}

export default function CartSidebar({ isOpen, onClose, items, onRemove, onUpdateQty, onCheckout }: CartSidebarProps) {
  const subtotal = items.reduce((sum, item) => sum + item.artwork.price * item.quantity, 0);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl transition-transform duration-500 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <div>
            <h2
              className="text-2xl font-light text-[#0a0a0a]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Your Cart
            </h2>
            <p
              className="text-xs text-gray-400 tracking-wider mt-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {totalUnits} {totalUnits === 1 ? "ITEM" : "ITEMS"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#0a0a0a] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-200 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p
                className="text-gray-400 text-lg font-light"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Your cart is empty
              </p>
              <p
                className="text-gray-300 text-xs mt-2 tracking-wider"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                DISCOVER OUR COLLECTION
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-6 border-b border-gray-50">
                  <div className="w-20 h-24 shrink-0 border-4 border-gray-200 overflow-hidden">
                    <img
                      src={assetUrl(item.artwork.image)}
                      alt={item.artwork.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-[#0a0a0a] font-light text-lg leading-tight"
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
                    <p
                      className={`text-[10px] tracking-[0.18em] mt-2 ${
                        item.artwork.inStock !== false && item.artwork.stockQuantity > 0
                          ? "text-emerald-700"
                          : "text-red-500"
                      }`}
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {item.artwork.inStock !== false && item.artwork.stockQuantity > 0
                        ? item.artwork.stockQuantity <= (item.artwork.lowStockThreshold ?? 3)
                          ? `ONLY ${item.artwork.stockQuantity} LEFT`
                          : "IN STOCK"
                        : "OUT OF STOCK"}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-gray-200">
                        <button
                          onClick={() => onUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-50 text-sm"
                        >
                          −
                        </button>
                        <span
                          className="w-7 text-center text-xs"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                          disabled={item.artwork.inStock === false || item.quantity >= item.artwork.stockQuantity}
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-50 text-sm disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <span
                        className="text-[#0a0a0a] font-light"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                      >
                        ${(item.artwork.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors self-start mt-1 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-8 py-6 border-t border-gray-100 bg-[#fafaf8]">
            <div className="flex justify-between items-center mb-2">
              <span
                className="text-xs text-gray-400 tracking-[0.2em]"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                SUBTOTAL
              </span>
              <span
                className="text-2xl font-light text-[#0a0a0a]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                ${subtotal.toLocaleString()}
              </span>
            </div>
            {subtotal >= 500 && (
              <p
                className="text-[#c8a830] text-xs tracking-wider mb-4"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                ✓ FREE WORLDWIDE SHIPPING INCLUDED
              </p>
            )}
            <p
              className="text-gray-400 text-xs mb-5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Taxes and duties calculated at checkout
            </p>
            <button
              onClick={onCheckout}
              className="w-full bg-[#0a0a0a] text-white py-4 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors duration-300 mb-3"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              PROCEED TO CHECKOUT
            </button>
            <button
              onClick={onClose}
              className="w-full border border-gray-200 text-gray-600 py-3 text-xs tracking-[0.2em] hover:border-gray-400 transition-colors"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              CONTINUE SHOPPING
            </button>
          </div>
        )}
      </div>
    </>
  );
}
