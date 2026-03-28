import { useState, useEffect } from "react";
import type { Product } from "../data/products";
import ArtworkCard from "./ArtworkCard";
import { apiUrl } from "../lib/api";

interface RecentlyViewedProps {
  limit?: number;
  onAddToCart: (product: Product, quantity?: number, selectedFrame?: string) => void;
  onViewDetail: (product: Product) => void;
}

export default function RecentlyViewed({
  limit = 6,
  onAddToCart,
  onViewDetail
}: RecentlyViewedProps) {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    void fetchRecentlyViewed();
  }, [limit, token]);

  const fetchRecentlyViewed = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`/api/shopping/recently-viewed?limit=${limit}`), {
        headers
      });
      const data = await response.json();

      if (data.success) {
        setRecentlyViewed(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch recently viewed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <h2
          className="text-2xl font-light text-[#0a0a0a] mb-8 text-center"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Recently Viewed
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-[4/5] mb-4"></div>
              <div className="bg-gray-200 h-4 mb-2"></div>
              <div className="bg-gray-200 h-3 w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-[#fafaf8]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <h2
          className="text-2xl font-light text-[#0a0a0a] mb-8 text-center"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Recently Viewed
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {recentlyViewed.map((product) => (
            <ArtworkCard
              key={product.id}
              artwork={product}
              onAddToCart={onAddToCart}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
