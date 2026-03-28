import { useEffect, useMemo, useRef, useState } from "react";
import FileUpload from "./FileUpload";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import {
  canEditAdminContent,
  canManageAdminSettings,
  getAdminRequestHeaders,
  getRoleLabel,
  hasAdminPanelAccess
} from "../lib/admin";
import {
  artCategories,
  artStyles,
  clothingSizes,
  fashionCategories,
  fashionColors,
  fashionMaterials,
  fashionStyles,
  frameColors,
  ProductVariant
} from "../data/products";
import { getMediaSelectionsFromUpload } from "../lib/media";

interface Artwork {
  id: number;
  title: string;
  artist: string;
  price: number;
  originalPrice?: number;
  category: string;
  productType: "artwork" | "fashion";
  style: string;
  size: string;
  dimensions: string;
  image: string;
  images?: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  frameColor: string;
  description: string;
  tags: string[];
  stockQuantity?: number;
  lowStockThreshold?: number;
  clothingSize?: string;
  color?: string;
  material?: string;
  careInstructions?: string;
  variants?: ProductVariant[];
  selectedVariantId?: string | null;
  imageAssetIds?: number[];
  createdAt: string;
  updatedAt: string;
}

interface DashboardAnalyticsData {
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    totalConversions: number;
    totalRevenue: number;
    conversionRate: number;
  };
  totalEvents: number;
}

interface DashboardSalesReport {
  salesReport: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
  totals: {
    averageOrderValue: number;
  };
}

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

const emptyForm = {
  title: "",
  artist: "",
  productType: "artwork" as "artwork" | "fashion",
  price: "",
  originalPrice: "",
  category: artCategories[0],
  style: artStyles[0],
  size: "Large",
  clothingSize: clothingSizes[2],
  dimensions: "",
  color: fashionColors[fashionColors.length - 1],
  variantSizes: [clothingSizes[2]] as string[],
  variantColors: [fashionColors[fashionColors.length - 1]] as string[],
  material: fashionMaterials[1],
  image: "",
  images: [] as string[],
  imageAssetIds: [] as number[],
  isNew: false,
  isFeatured: false,
  isBestseller: false,
  frameColor: frameColors[0],
  stockQuantity: "1",
  lowStockThreshold: "3",
  careInstructions: "",
  description: "",
  tags: "",
};

const pillClass =
  "inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const isValidEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const formatInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { user, bootstrapStatus, bootstrapAdmin, isLoading: authLoading } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    featured: number;
    newArrivals: number;
    bestsellers: number;
  } | null>(null);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<DashboardAnalyticsData | null>(null);
  const [salesSnapshot, setSalesSnapshot] = useState<DashboardSalesReport | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState(emptyForm);
  const [previewUrlMap, setPreviewUrlMap] = useState<Record<string, string>>({});
  const catalogSectionRef = useRef<HTMLElement | null>(null);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);

    return {
      startDate: formatInputDate(startDate),
      endDate: formatInputDate(endDate),
    };
  });
  const [bootstrapSaving, setBootstrapSaving] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapForm, setBootstrapForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const hasPanelAccess = hasAdminPanelAccess(user?.role);
  const canEdit = canEditAdminContent(user?.role);
  const isFashionProduct = formData.productType === "fashion";
  const imagePreviews = useMemo(
    () => Array.from(new Set([formData.image, ...formData.images].filter(Boolean))),
    [formData.image, formData.images]
  );
  const selectedVariantSizes = useMemo(
    () => Array.from(new Set(formData.variantSizes.filter(Boolean))),
    [formData.variantSizes]
  );
  const selectedVariantColors = useMemo(
    () => Array.from(new Set(formData.variantColors.filter(Boolean))),
    [formData.variantColors]
  );
  const generatedVariantCount = isFashionProduct ? selectedVariantSizes.length * selectedVariantColors.length : 0;
  const resolvePreviewUrl = (imageUrl: string) => {
    const mappedPreviewUrl = previewUrlMap[imageUrl];
    if (mappedPreviewUrl) {
      return mappedPreviewUrl;
    }

    if (/^(blob:|data:)/i.test(imageUrl)) {
      return imageUrl;
    }

    return assetUrl(imageUrl);
  };

  const quickActions = useMemo(
    () => [
      { id: "products", eyebrow: "Catalog", label: "Products", description: "Jump straight into product management and open the catalog form.", tone: "bg-[#fbf7ea]", locked: false },
      { id: "orders", eyebrow: "Ops", label: "Orders", description: "Track fulfillment and customer payment states.", tone: "bg-white", locked: !canEdit },
      { id: "crm", eyebrow: "Clients", label: "CRM", description: "Review customer details, spend, loyalty, and browsing activity.", tone: "bg-[#fbf7ea]", locked: false },
      { id: "blog-management", eyebrow: "Editorial", label: "Blog", description: "Edit editorial posts and product-linked stories.", tone: "bg-white", locked: !canEdit },
      { id: "media-management", eyebrow: "Assets", label: "Media", description: "Manage uploads, alt text, and library reuse.", tone: "bg-white", locked: !canEdit },
      { id: "analytics", eyebrow: "Insight", label: "Analytics", description: "Review revenue, traffic, and inventory movement.", tone: "bg-[#fbf7ea]", locked: false },
      { id: "settings", eyebrow: "Control", label: "Settings", description: "Storefront configuration plus backend team access only.", tone: "bg-white", locked: !canManageAdminSettings(user?.role) },
    ],
    [canEdit, user?.role]
  );

  const fetchArtworks = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/artworks"), {
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch artworks");
      }

      setArtworks(Array.isArray(data.data) ? data.data : []);
      setError(null);
    } catch (fetchError) {
      setError(getNetworkErrorMessage(fetchError, "Failed to fetch artworks"));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/artworks/stats"), {
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setStats(data.data);
      }
    } catch (fetchError) {
      console.error("Failed to fetch admin stats:", fetchError);
    }
  };

  const fetchDashboardInsights = async () => {
    try {
      const analyticsQuery = new URLSearchParams({
        period: "30d",
        startDate: analyticsDateRange.startDate,
        endDate: analyticsDateRange.endDate,
      });
      const salesQuery = new URLSearchParams({
        groupBy: "day",
        startDate: analyticsDateRange.startDate,
        endDate: analyticsDateRange.endDate,
      });

      const [analyticsResponse, salesResponse] = await Promise.all([
        fetch(apiUrl(`/api/analytics/dashboard?${analyticsQuery.toString()}`), {
          headers: getAdminRequestHeaders(),
        }),
        fetch(apiUrl(`/api/analytics/sales-report?${salesQuery.toString()}`), {
          headers: getAdminRequestHeaders(),
        }),
      ]);

      const [analyticsData, salesData] = await Promise.all([analyticsResponse.json(), salesResponse.json()]);

      if (analyticsResponse.ok && analyticsData?.success) {
        setAnalyticsSnapshot(analyticsData.data);
      }

      if (salesResponse.ok && salesData?.success) {
        setSalesSnapshot(salesData.data);
      }
    } catch (fetchError) {
      console.error("Failed to fetch dashboard analytics:", fetchError);
    }
  };

  useEffect(() => {
    if (!hasPanelAccess) {
      setLoading(false);
      return;
    }

    void fetchArtworks();
    void fetchStats();
    void fetchDashboardInsights();
  }, [analyticsDateRange.endDate, analyticsDateRange.startDate, hasPanelAccess]);

  useEffect(() => {
    if (!showProductManagement) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      catalogSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [showProductManagement]);

  const resetForm = () => {
    Object.values(previewUrlMap).forEach((previewUrl) => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    });
    setFormData(emptyForm);
    setPreviewUrlMap({});
    setEditingArtwork(null);
  };

  const handleInputChange = (field: keyof typeof emptyForm, value: string | boolean | string[] | number[]) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "productType") {
        if (value === "fashion") {
          next.category = fashionCategories[0];
          next.style = fashionStyles[0];
          next.frameColor = "N/A";
          next.size = clothingSizes[2];
          next.clothingSize = clothingSizes[2];
          next.variantSizes = [next.clothingSize];
          next.variantColors = [next.color || fashionColors[fashionColors.length - 1]];
          next.dimensions = next.dimensions || `Size ${clothingSizes[2]}`;
        } else {
          next.category = artCategories[0];
          next.style = artStyles[0];
          next.frameColor = frameColors[0];
          next.size = "Large";
          next.dimensions = "";
          next.variantSizes = [];
          next.variantColors = [];
        }
      }

      return next;
    });
    setSuccessMessage(null);
  };

  const toggleFashionOption = (field: "variantSizes" | "variantColors", value: string) => {
    setFormData((current) => {
      const currentValues = current[field];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      const uniqueValues = Array.from(new Set(nextValues));
      const next = {
        ...current,
        [field]: uniqueValues,
      };

      if (field === "variantSizes") {
        const nextSize = uniqueValues[0] || "";
        next.clothingSize = nextSize;
        next.size = nextSize || current.size;
      }

      if (field === "variantColors") {
        next.color = uniqueValues[0] || "";
      }

      return next;
    });
    setSuccessMessage(null);
  };

  const applyUploadedSelections = (result: unknown, previewUrls: string[] = []) => {
    const selections = getMediaSelectionsFromUpload(result);

    if (selections.length === 0) {
      return;
    }

    if (previewUrls.length > 0) {
      setPreviewUrlMap((current) => {
        const next = { ...current };
        selections.forEach((selection, index) => {
          if (previewUrls[index]) {
            next[selection.url] = previewUrls[index];
          }
        });
        return next;
      });
    }

    setFormData((current) => {
      const nextImages = Array.from(new Set([...current.images, ...selections.map((selection) => selection.url)]));
      const nextAssetIds = Array.from(
        new Set([
          ...current.imageAssetIds,
          ...selections
            .map((selection) => selection.assetId)
            .filter((assetId): assetId is number => typeof assetId === "number"),
        ])
      );

      return {
        ...current,
        image: nextImages[0] || "",
        images: nextImages,
        imageAssetIds: nextAssetIds,
      };
    });
  };

  const removeImageAtIndex = (indexToRemove: number) => {
    setFormData((current) => {
      const nextImages = current.images.filter((_, index) => index !== indexToRemove);
      const removedImage = current.images[indexToRemove];
      if (removedImage && previewUrlMap[removedImage]?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlMap[removedImage]);
      }
      setPreviewUrlMap((currentPreviewMap) => {
        const nextPreviewMap = { ...currentPreviewMap };
        delete nextPreviewMap[removedImage];
        return nextPreviewMap;
      });
      return {
        ...current,
        image: nextImages[0] || "",
        images: nextImages,
      };
    });
  };

  const handleEdit = (artwork: Artwork) => {
    const normalizedImages = Array.from(new Set([artwork.image, ...(artwork.images || [])].filter(Boolean)));
    const variantSizes = Array.isArray(artwork.variants)
      ? Array.from(new Set(artwork.variants.map((variant) => variant.size).filter(Boolean)))
      : [];
    const variantColors = Array.isArray(artwork.variants)
      ? Array.from(new Set(artwork.variants.map((variant) => variant.color).filter(Boolean)))
      : [];
    const defaultVariant = Array.isArray(artwork.variants)
      ? artwork.variants.find((variant) => variant.id === artwork.selectedVariantId) ||
        artwork.variants.find((variant) => variant.isDefault) ||
        artwork.variants[0]
      : null;

    setEditingArtwork(artwork);
    setFormData({
      title: artwork.title,
      artist: artwork.artist,
      productType: artwork.productType === "fashion" ? "fashion" : "artwork",
      price: artwork.price.toString(),
      originalPrice: artwork.originalPrice?.toString() || "",
      category: artwork.category,
      style: artwork.style,
      size: artwork.size,
      clothingSize: artwork.clothingSize || defaultVariant?.size || artwork.size || clothingSizes[2],
      dimensions: artwork.dimensions,
      color: artwork.color || defaultVariant?.color || fashionColors[fashionColors.length - 1],
      variantSizes:
        variantSizes.length > 0
          ? variantSizes
          : [artwork.clothingSize || defaultVariant?.size || artwork.size || clothingSizes[2]],
      variantColors:
        variantColors.length > 0
          ? variantColors
          : [artwork.color || defaultVariant?.color || fashionColors[fashionColors.length - 1]],
      material: artwork.material || defaultVariant?.material || fashionMaterials[1],
      image: normalizedImages[0] || "",
      images: normalizedImages,
      imageAssetIds: Array.isArray((artwork as Artwork & { imageAssetIds?: number[] }).imageAssetIds)
        ? (artwork as Artwork & { imageAssetIds?: number[] }).imageAssetIds || []
        : [],
      isNew: artwork.isNew || false,
      isFeatured: artwork.isFeatured || false,
      isBestseller: artwork.isBestseller || false,
      frameColor: artwork.frameColor,
      stockQuantity: String(artwork.stockQuantity ?? 1),
      lowStockThreshold: String(artwork.lowStockThreshold ?? 3),
      careInstructions: artwork.careInstructions || "",
      description: artwork.description,
      tags: artwork.tags.join(", "),
    });
    setPreviewUrlMap({});
    setShowCreateForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const normalizedImages = Array.from(new Set([formData.image, ...formData.images].filter(Boolean)));
      const parsedPrice = Number.parseFloat(formData.price);
      const parsedOriginalPrice = formData.originalPrice ? Number.parseFloat(formData.originalPrice) : undefined;
      const parsedStockQuantity = Math.max(0, Number.parseInt(formData.stockQuantity, 10) || 0);
      const parsedLowStockThreshold = Math.max(1, Number.parseInt(formData.lowStockThreshold, 10) || 3);
      const fashionVariantSizes = Array.from(
        new Set((formData.variantSizes.length > 0 ? formData.variantSizes : [formData.clothingSize]).filter(Boolean))
      );
      const fashionVariantColors = Array.from(
        new Set((formData.variantColors.length > 0 ? formData.variantColors : [formData.color]).filter(Boolean))
      );

      if (formData.productType === "fashion" && fashionVariantSizes.length === 0) {
        throw new Error("Choose at least one available size.");
      }

      if (formData.productType === "fashion" && fashionVariantColors.length === 0) {
        throw new Error("Choose at least one available color.");
      }

      const generatedVariants =
        formData.productType === "fashion"
          ? fashionVariantSizes.flatMap((size, sizeIndex) =>
              fashionVariantColors.map((color, colorIndex) => ({
                id: `${editingArtwork?.id || "new"}-variant-${sizeIndex + 1}-${colorIndex + 1}`,
                sku: `${formData.title || "product"}-${size}-${color}`
                  .trim()
                  .toUpperCase()
                  .replace(/[^A-Z0-9]+/g, "-"),
                size,
                color,
                material: formData.material || fashionMaterials[1],
                stockQuantity: parsedStockQuantity,
                price: parsedPrice,
                isDefault: sizeIndex === 0 && colorIndex === 0,
              }))
            )
          : undefined;

      const response = await fetch(
        editingArtwork ? apiUrl(`/api/admin/artworks/${editingArtwork.id}`) : apiUrl("/api/admin/artworks"),
        {
          method: editingArtwork ? "PUT" : "POST",
          headers: getAdminRequestHeaders({ json: true }),
          body: JSON.stringify({
            ...formData,
            image: normalizedImages[0] || "",
            images: normalizedImages,
            variants: generatedVariants,
            clothingSize: formData.productType === "fashion" ? fashionVariantSizes[0] : formData.clothingSize,
            color: formData.productType === "fashion" ? fashionVariantColors[0] : formData.color,
            size: formData.productType === "fashion" ? fashionVariantSizes[0] : formData.size,
            dimensions:
              formData.productType === "fashion"
                ? formData.dimensions ||
                  `Sizes ${fashionVariantSizes.join(", ")} · Colors ${fashionVariantColors.join(", ")}`
                : formData.dimensions,
            frameColor: formData.productType === "fashion" ? "N/A" : formData.frameColor,
            price: parsedPrice,
            originalPrice: parsedOriginalPrice,
            stockQuantity: parsedStockQuantity,
            lowStockThreshold: parsedLowStockThreshold,
            tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          }),
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save artwork");
      }

      resetForm();
      setShowCreateForm(false);
      setSuccessMessage(editingArtwork ? "Artwork updated successfully." : "Artwork created successfully.");
      await fetchArtworks();
      await fetchStats();
    } catch (submitError) {
      setError(getNetworkErrorMessage(submitError, "Failed to save artwork"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canEdit || !window.confirm("Delete this artwork from the catalog?")) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/admin/artworks/${id}`), {
        method: "DELETE",
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete artwork");
      }

      setSuccessMessage("Artwork deleted.");
      await fetchArtworks();
      await fetchStats();
    } catch (deleteError) {
      setError(getNetworkErrorMessage(deleteError, "Failed to delete artwork"));
    }
  };

  const handleBootstrapInputChange = (field: keyof typeof bootstrapForm, value: string) => {
    setBootstrapForm((current) => ({ ...current, [field]: value }));
    setBootstrapError(null);
  };

  const handleBootstrapSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidEmailAddress(bootstrapForm.email)) {
      setBootstrapError("Enter a valid email address to continue.");
      return;
    }

    if (bootstrapForm.password !== bootstrapForm.confirmPassword) {
      setBootstrapError("Passwords do not match.");
      return;
    }

    if (bootstrapForm.password.length < 8) {
      setBootstrapError("Password must be at least 8 characters long.");
      return;
    }

    setBootstrapSaving(true);
    setBootstrapError(null);

    const result = await bootstrapAdmin(
      bootstrapForm.email,
      bootstrapForm.password,
      bootstrapForm.firstName,
      bootstrapForm.lastName
    );

    if (!result.success) {
      setBootstrapError(result.message);
    }

    setBootstrapSaving(false);
  };

  const filteredArtworks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return artworks.filter((artwork) => {
      if (filter === "featured" && !artwork.isFeatured) {
        return false;
      }
      if (filter === "new" && !artwork.isNew) {
        return false;
      }
      if (filter === "bestseller" && !artwork.isBestseller) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [artwork.title, artwork.artist, artwork.category, artwork.style]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [artworks, filter, search]);

  const dashboardAnalytics = useMemo(() => {
    const totalProducts = stats?.total ?? artworks.length;
    const artworkCount = artworks.filter((artwork) => artwork.productType !== "fashion").length;
    const fashionCount = artworks.filter((artwork) => artwork.productType === "fashion").length;
    const featuredCount = stats?.featured ?? artworks.filter((artwork) => artwork.isFeatured).length;
    const newArrivalsCount = stats?.newArrivals ?? artworks.filter((artwork) => artwork.isNew).length;
    const bestsellerCount = stats?.bestsellers ?? artworks.filter((artwork) => artwork.isBestseller).length;
    const standardCount = artworks.filter((artwork) => !artwork.isFeatured && !artwork.isNew && !artwork.isBestseller).length;
    const totalInventory = artworks.reduce((sum, artwork) => sum + Math.max(0, artwork.stockQuantity ?? 0), 0);
    const averagePrice = artworks.length > 0 ? Math.round(artworks.reduce((sum, artwork) => sum + artwork.price, 0) / artworks.length) : 0;
    const categoryMap = new Map<string, number>();
    let outOfStock = 0;
    let lowStock = 0;

    artworks.forEach((artwork) => {
      categoryMap.set(artwork.category, (categoryMap.get(artwork.category) || 0) + 1);
      const stock = Math.max(0, artwork.stockQuantity ?? 0);
      const threshold = Math.max(1, artwork.lowStockThreshold ?? 3);

      if (stock === 0) {
        outOfStock += 1;
      } else if (stock <= threshold) {
        lowStock += 1;
      }
    });

    const healthyStock = Math.max(0, artworks.length - outOfStock - lowStock);
    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    const maxCategoryValue = Math.max(1, ...topCategories.map((entry) => entry.value));
    const maxStockState = Math.max(1, healthyStock, lowStock, outOfStock);

    return {
      totalProducts,
      totalInventory,
      averagePrice,
      liveCategories: categoryMap.size,
      productMix: [
        { label: "Artwork", value: artworkCount, color: "bg-[#111]" },
        { label: "Fashion", value: fashionCount, color: "bg-[#d8c06a]" },
      ],
      merchandisingMix: [
        { label: "Featured", value: featuredCount, color: "bg-[#d8c06a]" },
        { label: "New", value: newArrivalsCount, color: "bg-emerald-500" },
        { label: "Bestseller", value: bestsellerCount, color: "bg-sky-500" },
        { label: "Standard", value: standardCount, color: "bg-gray-300" },
      ],
      stockStates: [
        { label: "Healthy", value: healthyStock, color: "bg-emerald-500" },
        { label: "Low", value: lowStock, color: "bg-amber-400" },
        { label: "Out", value: outOfStock, color: "bg-rose-500" },
      ],
      maxStockState,
      topCategories,
      maxCategoryValue,
    };
  }, [artworks, stats]);

  const salesTrendData = useMemo(() => {
    const entries = salesSnapshot?.salesReport?.slice(-8) ?? [];
    const maxRevenue = Math.max(1, ...entries.map((entry) => entry.revenue));
    const points = entries
      .map((entry, index) => {
        const x = entries.length === 1 ? 50 : (index / Math.max(entries.length - 1, 1)) * 100;
        const y = 90 - (entry.revenue / maxRevenue) * 70;
        return `${x},${y}`;
      })
      .join(" ");

    return {
      entries,
      maxRevenue,
      points,
      areaPoints: entries.length > 0 ? `0,90 ${points} 100,90` : "",
    };
  }, [salesSnapshot]);

  const engagementMetrics = useMemo(
    () => [
      { label: "Views", value: analyticsSnapshot?.summary.totalPageViews ?? 0, color: "bg-[#111]" },
      { label: "Visitors", value: analyticsSnapshot?.summary.uniqueVisitors ?? 0, color: "bg-[#d8c06a]" },
      { label: "Conversions", value: analyticsSnapshot?.summary.totalConversions ?? 0, color: "bg-emerald-500" },
      { label: "Events", value: analyticsSnapshot?.totalEvents ?? 0, color: "bg-sky-500" },
    ],
    [analyticsSnapshot]
  );

  const maxEngagementValue = Math.max(1, ...engagementMetrics.map((metric) => metric.value));

  const handleQuickAction = (actionId: string) => {
    if (actionId === "products") {
      setShowProductManagement(true);
      resetForm();
      setShowCreateForm(false);
      return;
    }

    setShowProductManagement(false);
    onNavigate(actionId);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#c8a830] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasPanelAccess) {
    if (bootstrapStatus?.requiresAdminSetup) {
      return (
        <div className="min-h-screen bg-[#f6f3ec] pt-24 px-6 pb-12">
          <div className="mx-auto max-w-5xl border border-black/10 bg-white">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="border-b border-black/10 bg-[#111] px-8 py-10 text-white lg:border-b-0 lg:border-r lg:border-r-white/10">
                <p className="text-xs tracking-[0.35em] text-[#d8c06a]">FIRST-RUN SETUP</p>
                <h1
                  className="mt-4 text-4xl font-light"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Create the first admin account
                </h1>
                <p className="mt-4 max-w-xl text-sm text-white/70">
                  This installation no longer ships with a default admin login. Set up the first secure admin account here, and
                  then use User Management to add Managers or view-only backend users.
                </p>
                <div className="mt-8 space-y-3 text-sm text-white/75">
                  <p>Use a real email you control so future password reset flows stay predictable.</p>
                  <p>After setup, this account is signed in automatically and taken straight into the backend.</p>
                  <p>Customer signups remain separate from backend access.</p>
                </div>
              </section>

              <section className="px-8 py-10">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Admin Bootstrap</p>
                <h2
                  className="mt-2 text-3xl font-light text-[#111]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Secure your backend
                </h2>

                {bootstrapError && (
                  <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bootstrapError}</div>
                )}

                <form onSubmit={handleBootstrapSubmit} className="mt-6 space-y-5" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">First Name</span>
                      <input
                        type="text"
                        value={bootstrapForm.firstName}
                        onChange={(event) => handleBootstrapInputChange("firstName", event.target.value)}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Last Name</span>
                      <input
                        type="text"
                        value={bootstrapForm.lastName}
                        onChange={(event) => handleBootstrapInputChange("lastName", event.target.value)}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        required
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Email Address</span>
                    <input
                      type="text"
                      value={bootstrapForm.email}
                      onChange={(event) => handleBootstrapInputChange("email", event.target.value)}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      placeholder="owner@yourstudio.com"
                      autoComplete="email"
                      required
                    />
                    {bootstrapForm.email.trim().length > 0 && !isValidEmailAddress(bootstrapForm.email) && (
                      <span className="mt-2 block text-xs text-red-600">Enter a valid email address to continue.</span>
                    )}
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Password</span>
                      <input
                        type="password"
                        value={bootstrapForm.password}
                        onChange={(event) => handleBootstrapInputChange("password", event.target.value)}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        minLength={8}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Confirm Password</span>
                      <input
                        type="password"
                        value={bootstrapForm.confirmPassword}
                        onChange={(event) => handleBootstrapInputChange("confirmPassword", event.target.value)}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                        minLength={8}
                        required
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      disabled={bootstrapSaving}
                      className="bg-[#111] px-5 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:bg-[#c8a830] disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {bootstrapSaving ? "CREATING ACCOUNT..." : "CREATE ADMIN ACCOUNT"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate("home")}
                      className="border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
                    >
                      BACK TO WEBSITE
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">ADMIN BACKEND</p>
          <h1
            className="mt-4 text-4xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Sign in with an Admin, Manager, or view-only backend account to open the dashboard.
          </p>
          <button
            onClick={() => onNavigate("home")}
            className="mt-6 border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
          >
            BACK TO WEBSITE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] pt-24">
      <div className="border-y border-black/10 bg-[#111] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">CONTENT OPERATIONS</p>
            <h1
              className="mt-3 text-4xl font-light md:text-5xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Admin Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              A tighter backend for managing products, campaigns, content, and team access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 px-4 py-2 text-[11px] tracking-[0.18em] text-white/80">
              {getRoleLabel(user?.role)}
            </span>
            <button
              onClick={() => onNavigate("home")}
              className="border border-white/20 px-4 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:border-[#d8c06a] hover:text-[#d8c06a]"
            >
              BACK TO WEBSITE
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-6 py-8 lg:px-10">
        {!canEdit && (
          <div className="mb-6 border border-[#d8c06a]/30 bg-[#fbf7ea] px-4 py-3 text-sm text-[#6f5a17]">
            You are in view-only mode. You can inspect the backend, but only Admin and Manager roles can change content.
          </div>
        )}

        {error && <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {successMessage && (
          <div className="mb-6 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <section className="mb-6 border border-black/10 bg-white">
          <div className="flex flex-col gap-2 border-b border-black/10 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Quick Access</p>
              <h2
                className="mt-2 text-3xl font-light text-[#111]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Backend sections
              </h2>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Hover for more detail</p>
          </div>
          <div className="overflow-x-auto px-4 py-4">
            <div className="flex min-w-max gap-3 xl:min-w-0">
            {quickActions.map((action) => (
              <div key={action.id} className="group relative">
                <button
                  type="button"
                  onClick={() => !action.locked && handleQuickAction(action.id)}
                  disabled={action.locked}
                  title={action.description}
                  className={`${action.tone} w-[132px] shrink-0 border border-black/10 px-3 py-3 text-left transition-colors hover:border-[#d8c06a] hover:bg-[#f5f1e6] disabled:cursor-not-allowed disabled:opacity-60 xl:w-[138px]`}
                >
                  <p className="text-[9px] uppercase tracking-[0.22em] text-gray-400">{action.eyebrow}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#111]">{action.label}</p>
                    {action.locked ? (
                      <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400">Lock</span>
                    ) : (
                      <span className="text-sm text-gray-300">+</span>
                    )}
                  </div>
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-sm border border-black/10 bg-[#111] px-3 py-2 text-left shadow-xl group-hover:block">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8c06a]">{action.label}</p>
                  <p className="mt-1 text-xs text-white/80">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>

        {!showProductManagement && (stats || artworks.length > 0) && (
          <section className="mb-6 border border-black/10 bg-white">
            <div className="border-b border-black/10 px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Dashboard Analytics</p>
                  <h2
                    className="mt-2 text-3xl font-light text-[#111]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Live catalog snapshot
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-[160px_160px] xl:grid-cols-[160px_160px_auto] xl:items-end">
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-gray-400">Start Date</span>
                    <input
                      type="date"
                      value={analyticsDateRange.startDate}
                      max={analyticsDateRange.endDate}
                      onChange={(event) =>
                        setAnalyticsDateRange((current) => ({ ...current, startDate: event.target.value }))
                      }
                      className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#c8a830] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-gray-400">End Date</span>
                    <input
                      type="date"
                      value={analyticsDateRange.endDate}
                      min={analyticsDateRange.startDate}
                      onChange={(event) =>
                        setAnalyticsDateRange((current) => ({ ...current, endDate: event.target.value }))
                      }
                      className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#c8a830] focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const endDate = new Date();
                      const startDate = new Date();
                      startDate.setDate(endDate.getDate() - 29);
                      setAnalyticsDateRange({
                        startDate: formatInputDate(startDate),
                        endDate: formatInputDate(endDate),
                      });
                    }}
                    className="border border-gray-300 px-4 py-2.5 text-[11px] tracking-[0.18em] text-gray-600 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
                  >
                    LAST 30 DAYS
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Total Products", value: dashboardAnalytics.totalProducts, tone: "text-[#111]" },
                    { label: "Inventory Units", value: dashboardAnalytics.totalInventory, tone: "text-[#8b6b12]" },
                    { label: "Avg. Price", value: formatCurrency(dashboardAnalytics.averagePrice || 0), tone: "text-emerald-700" },
                    { label: "Live Categories", value: dashboardAnalytics.liveCategories, tone: "text-sky-700" },
                    { label: "Avg. Cart Value", value: formatCurrency(salesSnapshot?.totals.averageOrderValue || 0), tone: "text-rose-700" },
                  ].map((card) => (
                    <div key={card.label} className="border border-black/10 bg-[#fbfaf6] px-4 py-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{card.label}</p>
                      <p
                        className={`mt-2 text-3xl font-light ${card.tone}`}
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="border border-black/10 bg-[#fbfaf6] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Revenue Trend</p>
                    <h3
                      className="mt-2 text-2xl font-light text-[#111]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Sales values trend
                    </h3>
                    {salesTrendData.entries.length > 0 ? (
                      <>
                        <div className="mt-5 h-52 border border-black/10 bg-white p-4">
                          <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#d8c06a" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#d8c06a" stopOpacity="0.02" />
                              </linearGradient>
                            </defs>
                            {[20, 40, 60, 80].map((y) => (
                              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(17,17,17,0.08)" strokeWidth="0.6" />
                            ))}
                            <polygon points={salesTrendData.areaPoints} fill="url(#salesTrendFill)" />
                            <polyline
                              points={salesTrendData.points}
                              fill="none"
                              stroke="#111111"
                              strokeWidth="1.8"
                              vectorEffect="non-scaling-stroke"
                            />
                            {salesTrendData.entries.map((entry, index) => {
                              const x = salesTrendData.entries.length === 1 ? 50 : (index / Math.max(salesTrendData.entries.length - 1, 1)) * 100;
                              const y = 90 - (entry.revenue / salesTrendData.maxRevenue) * 70;
                              return <circle key={entry.period} cx={x} cy={y} r="2.1" fill="#d8c06a" stroke="#111111" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />;
                            })}
                          </svg>
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-3">
                          {salesTrendData.entries.slice(-4).map((entry) => (
                            <div key={entry.period} className="border border-black/10 bg-white px-3 py-3">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                                {new Date(entry.period).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                              <p className="mt-2 text-sm font-medium text-[#111]">{formatCurrency(entry.revenue)}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="mt-5 text-sm text-gray-500">Sales trend data will appear once orders are recorded.</p>
                    )}
                  </section>

                  <section className="border border-black/10 bg-[#fbfaf6] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Traffic Pulse</p>
                    <h3
                      className="mt-2 text-2xl font-light text-[#111]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Site engagement metrics
                    </h3>
                    <div className="mt-6 grid h-52 grid-cols-4 items-end gap-4 border border-black/10 bg-white p-4">
                      {engagementMetrics.map((metric) => (
                        <div key={metric.label} className="flex h-full flex-col justify-end">
                          <div
                            className={`w-full rounded-t-md ${metric.color}`}
                            style={{
                              height: `${Math.max(16, (metric.value / maxEngagementValue) * 160)}px`,
                            }}
                          />
                          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-gray-500">{metric.label}</p>
                          <p
                            className="mt-1 text-center text-2xl font-light text-[#111]"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          >
                            {metric.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="border border-black/10 bg-white px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Revenue</p>
                        <p className="mt-2 text-sm font-medium text-[#111]">
                          {formatCurrency(analyticsSnapshot?.summary.totalRevenue || 0)}
                        </p>
                      </div>
                      <div className="border border-black/10 bg-white px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Conversion Rate</p>
                        <p className="mt-2 text-sm font-medium text-[#111]">
                          {`${(analyticsSnapshot?.summary.conversionRate || 0).toFixed(2)}%`}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="border border-black/10 bg-[#fbfaf6] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Product Mix</p>
                    <h3
                      className="mt-2 text-2xl font-light text-[#111]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Artwork vs fashion
                    </h3>
                    <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-black/10">
                      {dashboardAnalytics.productMix.map((segment) => (
                        <div
                          key={segment.label}
                          className={segment.color}
                          style={{
                            width: `${dashboardAnalytics.totalProducts > 0 ? (segment.value / dashboardAnalytics.totalProducts) * 100 : 0}%`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {dashboardAnalytics.productMix.map((segment) => (
                        <div key={segment.label} className="border border-black/10 bg-white px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${segment.color}`} />
                            <p className="text-sm text-[#111]">{segment.label}</p>
                          </div>
                          <p
                            className="mt-2 text-2xl font-light text-[#111]"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          >
                            {segment.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="border border-black/10 bg-[#fbfaf6] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Merchandising</p>
                    <h3
                      className="mt-2 text-2xl font-light text-[#111]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Placement balance
                    </h3>
                    <div className="mt-5 space-y-4">
                      {dashboardAnalytics.merchandisingMix.map((segment) => (
                        <div key={segment.label}>
                          <div className="flex items-center justify-between gap-3 text-sm text-[#111]">
                            <span>{segment.label}</span>
                            <span>{segment.value}</span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10">
                            <div
                              className={`h-full rounded-full ${segment.color}`}
                              style={{
                                width: `${dashboardAnalytics.totalProducts > 0 ? (segment.value / dashboardAnalytics.totalProducts) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="grid gap-6">
                <section className="border border-black/10 bg-[#fbfaf6] p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Inventory Health</p>
                  <h3
                    className="mt-2 text-2xl font-light text-[#111]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Stock pulse
                  </h3>
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    {dashboardAnalytics.stockStates.map((state) => (
                      <div key={state.label} className="flex flex-col items-center">
                        <div className="flex h-36 items-end">
                          <div
                            className={`w-14 rounded-t-md ${state.color}`}
                            style={{
                              height: `${dashboardAnalytics.maxStockState > 0 ? Math.max(18, (state.value / dashboardAnalytics.maxStockState) * 144) : 18}px`,
                            }}
                          />
                        </div>
                        <p className="mt-3 text-sm text-[#111]">{state.label}</p>
                        <p
                          className="mt-1 text-2xl font-light text-[#111]"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {state.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="border border-black/10 bg-[#fbfaf6] p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Top Categories</p>
                  <h3
                    className="mt-2 text-2xl font-light text-[#111]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    What the catalog leans toward
                  </h3>
                  <div className="mt-5 space-y-4">
                    {dashboardAnalytics.topCategories.length > 0 ? (
                      dashboardAnalytics.topCategories.map((category) => (
                        <div key={category.label}>
                          <div className="flex items-center justify-between gap-3 text-sm text-[#111]">
                            <span>{category.label}</span>
                            <span>{category.value}</span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10">
                            <div
                              className="h-full rounded-full bg-[#111]"
                              style={{ width: `${(category.value / dashboardAnalytics.maxCategoryValue) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Category distribution will appear as products are added.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        )}

        {showProductManagement && (
        <section ref={catalogSectionRef} className="border border-black/10 bg-white">
          <div className="flex flex-col gap-4 border-b border-black/10 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Catalog</p>
              <h2
                className="mt-2 text-3xl font-light text-[#111]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Product management
              </h2>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={() => {
                  setShowProductManagement(false);
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="border border-gray-300 px-4 py-3 text-[11px] tracking-[0.18em] text-gray-600 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
              >
                CLOSE PRODUCT MANAGEMENT
              </button>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none md:w-60"
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              >
                <option value="all">All products</option>
                <option value="featured">Featured</option>
                <option value="new">New arrivals</option>
                <option value="bestseller">Bestsellers</option>
              </select>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm((current) => !current || Boolean(editingArtwork));
                  }}
                  className="bg-[#111] px-5 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:bg-[#c8a830]"
                >
                  {showCreateForm ? "CLOSE FORM" : "ADD PRODUCT"}
                </button>
              )}
            </div>
          </div>

          {showCreateForm && canEdit && (
            <form onSubmit={handleSubmit} className="border-b border-black/10 bg-[#fbfaf6] px-6 py-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                    {editingArtwork ? "Update Product" : "New Product"}
                  </p>
                  <h3
                    className="mt-2 text-2xl font-light text-[#111]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {editingArtwork ? editingArtwork.title : "Create a new catalog entry"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="border border-gray-300 px-4 py-2 text-[11px] tracking-[0.18em] text-gray-600 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
                >
                  CANCEL
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Product Type</span>
                  <select
                    value={formData.productType}
                    onChange={(event) => handleInputChange("productType", event.target.value as "artwork" | "fashion")}
                    className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                  >
                    <option value="artwork">Artwork</option>
                    <option value="fashion">Fashion</option>
                  </select>
                </label>

                {[
                  { key: "title", label: "Title", type: "text" },
                  { key: "artist", label: "Artist", type: "text" },
                  { key: "price", label: "Price", type: "number" },
                  { key: "originalPrice", label: "Original Price", type: "number" },
                  { key: "stockQuantity", label: isFashionProduct ? "Stock Per Variant" : "Stock Quantity", type: "number" },
                  { key: "lowStockThreshold", label: "Low Stock Alert", type: "number" },
                ].map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">
                      {field.label}
                    </span>
                    <input
                      type={field.type}
                      value={String(formData[field.key as keyof typeof formData])}
                      onChange={(event) => handleInputChange(field.key, event.target.value)}
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      required={field.key !== "originalPrice"}
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Category</span>
                  <select
                    value={formData.category}
                    onChange={(event) => handleInputChange("category", event.target.value)}
                    className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                  >
                    {(isFashionProduct ? fashionCategories : artCategories).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Style</span>
                  <select
                    value={formData.style}
                    onChange={(event) => handleInputChange("style", event.target.value)}
                    className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                  >
                    {(isFashionProduct ? fashionStyles : artStyles).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">
                    {isFashionProduct ? "Clothing Size" : "Size"}
                  </span>
                  {isFashionProduct ? (
                    <div className="border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap gap-2">
                        {clothingSizes.map((option) => {
                          const active = selectedVariantSizes.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleFashionOption("variantSizes", option)}
                              className={`px-3 py-2 text-xs tracking-[0.16em] transition-colors ${
                                active
                                  ? "border border-[#c8a830] bg-[#fbf7ea] text-[#8b6b12]"
                                  : "border border-gray-200 text-gray-600 hover:border-[#c8a830] hover:text-[#8b6b12]"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-gray-400">
                        Pick every size this product should offer. The first selected size is used as the default.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={formData.size}
                      onChange={(event) => handleInputChange("size", event.target.value)}
                      className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    >
                      {["Small", "Medium", "Large", "XLarge"].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Dimensions</span>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={(event) => handleInputChange("dimensions", event.target.value)}
                    placeholder={isFashionProduct ? "Size M / fit notes" : "80 x 100 cm"}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    required
                  />
                </label>

                {isFashionProduct ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Color</span>
                      <div className="border border-gray-200 bg-white p-4">
                        <div className="flex flex-wrap gap-2">
                          {fashionColors.map((option) => {
                            const active = selectedVariantColors.includes(option);
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => toggleFashionOption("variantColors", option)}
                                className={`px-3 py-2 text-xs tracking-[0.16em] transition-colors ${
                                  active
                                    ? "border border-[#c8a830] bg-[#fbf7ea] text-[#8b6b12]"
                                    : "border border-gray-200 text-gray-600 hover:border-[#c8a830] hover:text-[#8b6b12]"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-3 text-xs text-gray-400">
                          Select all colorways for this product. The first selected color becomes the default.
                        </p>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Material</span>
                      <select
                        value={formData.material}
                        onChange={(event) => handleInputChange("material", event.target.value)}
                        className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      >
                        {fashionMaterials.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-sm border border-[#eadfbc] bg-[#fbf7ea] px-4 py-3 text-sm text-[#6b5520] lg:col-span-2">
                      {generatedVariantCount > 0
                        ? `${generatedVariantCount} sellable variants will be created from ${selectedVariantSizes.length} size${selectedVariantSizes.length === 1 ? "" : "s"} and ${selectedVariantColors.length} color${selectedVariantColors.length === 1 ? "" : "s"}.`
                        : "Choose at least one size and one color to generate fashion variants."}
                    </div>
                  </>
                ) : (
                  <label className="block">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Frame Color</span>
                    <select
                      value={formData.frameColor}
                      onChange={(event) => handleInputChange("frameColor", event.target.value)}
                      className="w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    >
                      {frameColors.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="lg:col-span-3">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">
                    Product Images
                  </span>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                      <FileUpload
                        onUpload={applyUploadedSelections}
                        type={isFashionProduct ? "general" : "artwork"}
                        multiple
                      />
                      <input
                        type="url"
                        value={formData.image}
                        onChange={(event) => {
                          handleInputChange("image", event.target.value);
                          if (event.target.value.trim()) {
                            setFormData((current) => ({
                              ...current,
                              image: event.target.value,
                              images: Array.from(new Set([event.target.value, ...current.images.filter(Boolean)])),
                            }));
                          }
                        }}
                        placeholder="Paste a primary image URL"
                        className="mt-3 w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      />
                      <p className="mt-2 text-xs text-gray-400">
                        You can upload one or many images. The first image is used as the main product thumbnail.
                      </p>
                    </div>
                    <div className="border border-dashed border-gray-300 bg-white p-3">
                      {imagePreviews.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {imagePreviews.map((imageUrl, index) => (
                            <div key={`${imageUrl}-${index}`} className="relative overflow-hidden border border-black/10 bg-[#f8f6f0]">
                              <img src={resolvePreviewUrl(imageUrl)} alt={`Product preview ${index + 1}`} className="h-32 w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeImageAtIndex(index)}
                                className="absolute right-2 top-2 bg-black/75 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white"
                              >
                                Remove
                              </button>
                              <div className="px-2 py-2 text-[10px] uppercase tracking-[0.18em] text-gray-500">
                                {index === 0 ? "Primary image" : `Gallery ${index + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full min-h-44 items-center justify-center">
                          <p className="text-center text-sm text-gray-400">Image previews appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isFashionProduct && (
                  <label className="block lg:col-span-3">
                    <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Care Instructions</span>
                    <textarea
                      value={formData.careInstructions}
                      onChange={(event) => handleInputChange("careInstructions", event.target.value)}
                      rows={3}
                      className="w-full resize-none border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                      placeholder="Dry clean only. Iron on low heat."
                    />
                  </label>
                )}

                <label className="block lg:col-span-3">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Description</span>
                  <textarea
                    value={formData.description}
                    onChange={(event) => handleInputChange("description", event.target.value)}
                    rows={4}
                    className="w-full resize-none border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                    required
                  />
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Tags</span>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(event) => handleInputChange("tags", event.target.value)}
                    placeholder="abstract, gold, contemporary"
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-5 lg:col-span-1">
                  {[
                    { key: "isNew", label: "New" },
                    { key: "isFeatured", label: "Featured" },
                    { key: "isBestseller", label: "Bestseller" },
                  ].map((toggle) => (
                    <label key={toggle.key} className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={Boolean(formData[toggle.key as keyof typeof formData])}
                        onChange={(event) => handleInputChange(toggle.key, event.target.checked)}
                        className="h-4 w-4 accent-[#c8a830]"
                      />
                      {toggle.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#111] px-5 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:bg-[#c8a830] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "SAVING..." : editingArtwork ? "UPDATE PRODUCT" : "CREATE PRODUCT"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-500">Loading catalog...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#f8f6f0]">
                  <tr>
                    {["Product", "Price", "Status", "Updated", "Actions"].map((heading) => (
                      <th key={heading} className="px-6 py-4 text-left text-[11px] uppercase tracking-[0.18em] text-gray-400">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredArtworks.map((artwork) => (
                    <tr key={artwork.id} className="border-t border-black/5 align-top">
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-4">
                          <img src={assetUrl(artwork.image)} alt={artwork.title} className="h-20 w-16 border border-black/10 object-cover" />
                          <div>
                            <p className="text-sm font-medium text-[#111]">{artwork.title}</p>
                            <p className="mt-1 text-sm text-gray-500">
                              {artwork.artist} · {artwork.category} · {artwork.style}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">{artwork.dimensions}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-[#111]">{formatCurrency(artwork.price)}</p>
                        {artwork.originalPrice ? (
                          <p className="mt-1 text-sm text-gray-400 line-through">{formatCurrency(artwork.originalPrice)}</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          {artwork.isFeatured && <span className={`${pillClass} bg-[#fbf0c7] text-[#8b6b12]`}>Featured</span>}
                          {artwork.isNew && <span className={`${pillClass} bg-emerald-100 text-emerald-700`}>New</span>}
                          {artwork.isBestseller && <span className={`${pillClass} bg-sky-100 text-sky-700`}>Bestseller</span>}
                          {!artwork.isFeatured && !artwork.isNew && !artwork.isBestseller && (
                            <span className={`${pillClass} bg-gray-100 text-gray-500`}>Standard</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-500">{formatDate(artwork.updatedAt)}</td>
                      <td className="px-6 py-5">
                        {canEdit ? (
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(artwork)}
                              className="text-[11px] uppercase tracking-[0.18em] text-[#8b6b12] hover:text-[#c8a830]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(artwork.id)}
                              className="text-[11px] uppercase tracking-[0.18em] text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">View only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredArtworks.length === 0 && (
                <div className="border-t border-black/10 px-6 py-12 text-center text-sm text-gray-500">
                  No products matched your current filters.
                </div>
              )}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
