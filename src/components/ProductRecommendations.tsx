import { useState, useEffect } from "react";
import type { Product } from "../data/products";
import ArtworkCard from "./ArtworkCard";
import { apiUrl } from "../lib/api";

interface ProductRecommendationsProps {
  currentProductId?: number;
  title?: string;
  limit?: number;
  onAddToCart: (product: Product, quantity?: number, selectedFrame?: string) => void;
  onViewDetail: (product: Product) => void;
}

export default function ProductRecommendations({
  currentProductId,
  title = "You May Also Like",
  limit = 8,
  onAddToCart,
  onViewDetail
}: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchRecommendations();
  }, [currentProductId, limit]);

  const fetchRecommendations = async () => {
    try {
      const params = new URLSearchParams();
      if (currentProductId) params.append('productId', currentProductId.toString());
      params.append('limit', limit.toString());

      const response = await fetch(apiUrl(`/api/shopping/recommendations?${params.toString()}`));
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
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
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
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

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="py-12">
      <h2
        className="text-2xl font-light text-[#0a0a0a] mb-8 text-center"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {recommendations.map((product) => (
          <ArtworkCard
            key={product.id}
            artwork={product}
            onAddToCart={onAddToCart}
            onViewDetail={onViewDetail}
          />
        ))}
      </div>
    </div>
  );
}
