import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl } from "../lib/api";
import {
  canEditAdminContent,
  getAdminRequestHeaders,
  getRoleLabel,
  hasAdminPanelAccess
} from "../lib/admin";

interface DiscountCode {
  id: number;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

interface DiscountManagementProps {
  onBack?: () => void;
  embedded?: boolean;
}

export default function DiscountManagement({ onBack, embedded = false }: DiscountManagementProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [stats, setStats] = useState<any>(null);
  const hasPanelAccess = hasAdminPanelAccess(user?.role);
  const canEdit = canEditAdminContent(user?.role);
  const handleBack = () => onBack?.();

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "",
    minOrderAmount: "",
    maxDiscount: "",
    usageLimit: "",
    validFrom: "",
    validUntil: ""
  });

  useEffect(() => {
    if (!hasPanelAccess) {
      setLoading(false);
      return;
    }

    fetchDiscountCodes();
    fetchStats();
  }, [hasPanelAccess]);

  const fetchDiscountCodes = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/discounts"), {
        headers: getAdminRequestHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setDiscountCodes(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch discount codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(apiUrl("/api/admin/discounts/stats"), {
        headers: getAdminRequestHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      return;
    }

    setLoading(true);

    try {
      const url = editingCode 
        ? apiUrl(`/api/admin/discounts/${editingCode.id}`)
        : apiUrl("/api/admin/discounts");
      
      const method = editingCode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: getAdminRequestHeaders({ json: true }),
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
          minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : parseFloat(formData.value),
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchDiscountCodes();
        await fetchStats();
        resetForm();
        setShowCreateForm(false);
        setEditingCode(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to save discount code");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      type: code.type,
      value: code.value.toString(),
      minOrderAmount: code.minOrderAmount.toString(),
      maxDiscount: code.maxDiscount.toString(),
      usageLimit: code.usageLimit?.toString() || "",
      validFrom: code.validFrom.split('T')[0],
      validUntil: code.validUntil.split('T')[0]
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!canEdit) {
      return;
    }

    if (!confirm("Are you sure you want to delete this discount code?")) return;

    try {
      const response = await fetch(apiUrl(`/api/admin/discounts/${id}`), {
        method: "DELETE",
        headers: getAdminRequestHeaders()
      });

      const data = await response.json();
      if (data.success) {
        await fetchDiscountCodes();
        await fetchStats();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete discount code");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: "",
      minOrderAmount: "",
      maxDiscount: "",
      usageLimit: "",
      validFrom: "",
      validUntil: ""
    });
  };

  const getTypeColor = (type: string) => {
    return type === "percentage" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  if (authLoading) {
    if (embedded) {
      return (
        <div className="border border-black/10 bg-white px-6 py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discount access...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasPanelAccess) {
    if (embedded) {
      return (
        <div className="border border-black/10 bg-white px-6 py-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">DISCOUNTS</p>
          <h2 className="mt-4 text-3xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Admin access required
          </h2>
          <p className="mt-4 text-sm text-gray-600">
            Sign in with a backend role to review discount campaigns.
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">DISCOUNT MANAGEMENT</p>
          <h1 className="mt-4 text-4xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Sign in with a backend role to review discount campaigns.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  if (loading && discountCodes.length === 0) {
    if (embedded) {
      return (
        <div className="border border-black/10 bg-white px-6 py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discount codes...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discount codes...</p>
        </div>
      </div>
    );
  }

  const statsSection = stats ? (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <div className="bg-white border border-gray-100 p-6">
        <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          TOTAL CODES
        </h3>
        <p className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {stats.total}
        </p>
      </div>
      <div className="bg-white border border-gray-100 p-6">
        <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          ACTIVE CODES
        </h3>
        <p className="text-3xl font-light text-green-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {stats.active}
        </p>
      </div>
      <div className="bg-white border border-gray-100 p-6">
        <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          TOTAL USAGE
        </h3>
        <p className="text-3xl font-light text-[#c8a830]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {stats.totalUsage}
        </p>
      </div>
      <div className="bg-white border border-gray-100 p-6">
        <h3 className="text-xs tracking-[0.2em] text-gray-400 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          PERCENTAGE CODES
        </h3>
        <p className="text-3xl font-light text-blue-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {stats.percentageCodes}
        </p>
      </div>
    </div>
  ) : null;

  const discountContent = (
    <div className="space-y-8">
      {!canEdit && (
        <div className="border border-[#d8c06a]/30 bg-[#fbf7ea] px-4 py-3 text-sm text-[#6f5a17]">
          You are in view-only mode. Creating, editing, and deleting discount codes is disabled.
        </div>
      )}

      {statsSection}

      {canEdit && (
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => {
              resetForm();
              setEditingCode(null);
              setShowCreateForm(true);
            }}
            className="bg-[#0a0a0a] text-white px-6 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            + CREATE DISCOUNT CODE
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button onClick={() => setError(null)} className="float-right text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {showCreateForm && canEdit && (
        <div className="bg-white border border-gray-100 p-8">
          <h2 className="text-2xl font-light text-[#0a0a0a] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {editingCode ? "Edit Discount Code" : "Create New Discount Code"}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                CODE *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                placeholder="e.g., SAVE20"
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                TYPE *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none bg-white"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                VALUE *
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => handleInputChange("value", e.target.value)}
                placeholder={formData.type === "percentage" ? "10" : "20"}
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                MIN ORDER AMOUNT
              </label>
              <input
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) => handleInputChange("minOrderAmount", e.target.value)}
                placeholder="100"
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                MAX DISCOUNT
              </label>
              <input
                type="number"
                value={formData.maxDiscount}
                onChange={(e) => handleInputChange("maxDiscount", e.target.value)}
                placeholder="50"
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                USAGE LIMIT
              </label>
              <input
                type="number"
                value={formData.usageLimit}
                onChange={(e) => handleInputChange("usageLimit", e.target.value)}
                placeholder="100"
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                VALID FROM
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => handleInputChange("validFrom", e.target.value)}
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs tracking-[0.2em] text-gray-400 block mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                VALID UNTIL
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => handleInputChange("validUntil", e.target.value)}
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#0a0a0a] text-white px-8 py-3 text-xs tracking-[0.2em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {loading ? "SAVING..." : (editingCode ? "UPDATE CODE" : "CREATE CODE")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingCode(null);
                  resetForm();
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

      <div className="bg-white border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Discount Codes ({discountCodes.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  CODE
                </th>
                <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  TYPE
                </th>
                <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  VALUE
                </th>
                <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  USAGE
                </th>
                <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  STATUS
                </th>
                <th className="px-6 py-4 text-left text-xs tracking-[0.2em] text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {discountCodes.map((code) => (
                <tr key={code.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-[#0a0a0a] font-mono text-sm">{code.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded ${getTypeColor(code.type)}`}>
                      {code.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#0a0a0a] font-light" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>
                      {code.type === "percentage" ? `${code.value}%` : `$${code.value}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {code.usedCount}{code.usageLimit ? `/${code.usageLimit}` : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded ${getStatusColor(code.isActive)}`}>
                      {code.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {canEdit ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(code)}
                          className="text-xs text-[#c8a830] hover:underline"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="text-xs text-red-500 hover:underline"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          DELETE
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
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="space-y-6">{discountContent}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f3ec] pt-24">
      <div className="border-y border-black/10 bg-[#111] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">CAMPAIGN CONTROL</p>
            <h1 className="mt-3 text-4xl font-light md:text-5xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Discount Codes
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Launch cleaner offers, monitor usage, and keep promotional logic easy to manage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 px-4 py-2 text-[11px] tracking-[0.18em] text-white/80">
              {getRoleLabel(user?.role)}
            </span>
            <button
              onClick={handleBack}
              className="border border-white/20 px-4 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:border-[#d8c06a] hover:text-[#d8c06a]"
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {discountContent}
      </div>
    </div>
  );
}
