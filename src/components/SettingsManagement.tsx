import { useEffect, useState } from "react";
import AuditLogManagement from "./AuditLogManagement";
import DiscountManagement from "./DiscountManagement";
import UserManagement from "./UserManagement";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl, getNetworkErrorMessage, parseJsonResponse } from "../lib/api";
import {
  canManageAdminSettings,
  getAdminRequestHeaders,
  getRoleLabel,
  hasAdminPanelAccess
} from "../lib/admin";

interface SettingsManagementProps {
  onBack: () => void;
  initialTab?: SettingsTabId;
}

type SettingsTabId = "commerce" | "homepage" | "seo" | "team" | "discounts" | "audit";

interface StorefrontSettings {
  shipping: {
    currency: string;
    freeShippingThreshold: number;
    standardShippingCost: number;
    shippingLabel: string;
    estimatedDelivery: string;
  };
  tax: {
    enabled: boolean;
    taxRate: number;
    taxLabel: string;
  };
  payment: {
    paymentMode: "live" | "test";
    providerName: string;
    guestCheckoutEnabled: boolean;
    livePublicKey: string;
    liveSecretKey: string;
    testPublicKey: string;
    testSecretKey: string;
    webhookSecret: string;
    checkoutNotice: string;
  };
  email: {
    providerName: string;
    fromName: string;
    fromAddress: string;
    replyToAddress: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    secure: boolean;
    orderConfirmationEnabled: boolean;
    shippingUpdateEnabled: boolean;
    newsletterEnabled: boolean;
  };
  inventory: {
    lowStockThreshold: number;
  };
  media: {
    uploadStorage: "local" | "cloudinary";
    backendPublicUrl: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    cloudinaryFolder: string;
  };
  homepage: {
    showCategoryShowcase: boolean;
    showFeatured: boolean;
    showEditorial: boolean;
    showPromoGrid: boolean;
    showNewArrivals: boolean;
    showPromise: boolean;
    heroEyebrow: string;
    heroLineOne: string;
    heroLineTwo: string;
    heroLineThree: string;
    heroBackgroundImage: string;
    heroTagline: string;
    featuredHeading: string;
    featuredEyebrow: string;
    newArrivalsHeading: string;
    newArrivalsEyebrow: string;
    editorialEyebrow: string;
    editorialHeading: string;
    editorialBackgroundImage: string;
    editorialBody: string;
    promoEyebrow: string;
    promoHeading: string;
    promoBlocks: Array<{
      eyebrow: string;
      title: string;
      body: string;
      image: string;
      ctaLabel: string;
      ctaPage: string;
    }>;
    promiseEyebrow: string;
    promiseHeading: string;
    promiseItems: Array<{
      title: string;
      description: string;
    }>;
  };
  seo: {
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
    defaultKeywords: string;
    defaultImage: string;
    locale: string;
    organizationName: string;
    organizationEmail: string;
    organizationPhone: string;
    organizationCountry: string;
    organizationCity: string;
    slogan: string;
  };
}

const defaultSettings: StorefrontSettings = {
  shipping: {
    currency: "USD",
    freeShippingThreshold: 500,
    standardShippingCost: 50,
    shippingLabel: "Standard delivery",
    estimatedDelivery: "3-5 business days",
  },
  tax: {
    enabled: false,
    taxRate: 0,
    taxLabel: "Sales tax",
  },
  payment: {
    paymentMode: "live",
    providerName: "Paystack",
    guestCheckoutEnabled: true,
    livePublicKey: "",
    liveSecretKey: "",
    testPublicKey: "",
    testSecretKey: "",
    webhookSecret: "",
    checkoutNotice: "All payments are securely processed and confirmed before fulfillment begins.",
  },
  email: {
    providerName: "SMTP",
    fromName: "Sinipo Art Studio",
    fromAddress: "hello@sinipo.art",
    replyToAddress: "hello@sinipo.art",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    secure: false,
    orderConfirmationEnabled: true,
    shippingUpdateEnabled: true,
    newsletterEnabled: true,
  },
  inventory: {
    lowStockThreshold: 3,
  },
  media: {
    uploadStorage: "local",
    backendPublicUrl: "",
    cloudinaryCloudName: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    cloudinaryFolder: "sinipo-art",
  },
  homepage: {
    showCategoryShowcase: true,
    showFeatured: true,
    showEditorial: true,
    showPromoGrid: true,
    showNewArrivals: true,
    showPromise: true,
    heroEyebrow: "PREMIUM ART STUDIO",
    heroLineOne: "Discover Art",
    heroLineTwo: "That Speaks",
    heroLineThree: "To Your Soul",
    heroBackgroundImage: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=1800&q=90",
    heroTagline:
      "Curated premium framed artworks by world-class artists. Each piece arrives ready to transform your space.",
    featuredHeading: "Featured Works",
    featuredEyebrow: "HANDPICKED",
    newArrivalsHeading: "New Arrivals",
    newArrivalsEyebrow: "JUST ARRIVED",
    editorialEyebrow: "OUR PHILOSOPHY",
    editorialHeading: "Art is the Knot That Binds Us Stronger Together",
    editorialBackgroundImage: "https://images.unsplash.com/photo-1549289524-06cf8837ace5?w=1800&q=80",
    editorialBody:
      "At Sinipo, we believe every piece of art is a thread - connecting creator and collector, past and present, emotion and space. Our curated collection celebrates the beauty of human connection through extraordinary artworks.",
    promoEyebrow: "COLLECT WITH INTENTION",
    promoHeading: "Featured Moments Across The Store",
    promoBlocks: [
      {
        eyebrow: "NEW SEASON",
        title: "Gallery-ready drops for modern spaces",
        body: "Highlight your newest framed works, collectible fashion pieces, or category campaigns here.",
        image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
        ctaLabel: "Explore new arrivals",
        ctaPage: "shop",
      },
      {
        eyebrow: "EDITORIAL PICK",
        title: "Build a layered story through art and fashion",
        body: "Use this card for styling stories, limited edits, or a curated capsule you want customers to discover fast.",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80",
        ctaLabel: "Read the journal",
        ctaPage: "blog",
      },
      {
        eyebrow: "CURATOR NOTE",
        title: "Commission-worthy pieces with collectible detail",
        body: "Use the third promo to spotlight premium services, custom framing, or your highest-margin story.",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80",
        ctaLabel: "Meet the studio",
        ctaPage: "about",
      },
    ],
    promiseEyebrow: "THE SINIPO PROMISE",
    promiseHeading: "Why Collect With Us",
    promiseItems: [
      {
        title: "Curated Quality",
        description:
          "Every artwork is hand-selected by our curatorial team for exceptional quality and artistic merit.",
      },
      {
        title: "Premium Framing",
        description:
          "Museum-quality frames in 5 finishes, paired with archival matting and UV-protective glass.",
      },
      {
        title: "Ready to Hang",
        description:
          "Delivered professionally packaged, ready to hang with no visit to a framer required.",
      },
      {
        title: "Authenticity",
        description:
          "Each piece includes a certificate of authenticity and full provenance documentation.",
      },
    ],
  },
  seo: {
    siteName: "Sinipo Art Studio",
    defaultTitle: "Sinipo Art Studio - Premium Art & Fashion",
    defaultDescription:
      "Discover stunning artworks and fashion pieces at Sinipo Art Studio. Premium quality, curated collections, worldwide shipping.",
    defaultKeywords:
      "art, fashion, premium, gallery, contemporary, modern, abstract, paintings, designer clothing",
    defaultImage: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&q=80",
    locale: "en_US",
    organizationName: "Sinipo Art Studio",
    organizationEmail: "hello@sinipo.art",
    organizationPhone: "+234-800-000-0000",
    organizationCountry: "NG",
    organizationCity: "Lagos",
    slogan: "Where Art Meets Fashion",
  },
};

const sectionLabelClass = "mb-2 text-[11px] uppercase tracking-[0.18em] text-gray-400";
const inputClass =
  "w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none";
const textareaClass =
  "w-full resize-none border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none";

interface TextFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "email" | "number" | "password";
}

function TextField({ label, value, onChange, type = "text" }: TextFieldProps) {
  return (
    <label className="block">
      <span className={sectionLabelClass}>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

interface ToggleFieldProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleField({ label, description, checked, onChange, disabled = false }: ToggleFieldProps) {
  return (
    <label className="flex items-start justify-between gap-4 border border-black/10 bg-[#fbfaf6] px-4 py-3">
      <div>
        <p className="text-sm text-[#111]">{label}</p>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 accent-[#c8a830]"
      />
    </label>
  );
}

const settingsTabs = [
  { id: "commerce", label: "Commerce", description: "Shipping, tax, payment, and inventory." },
  { id: "homepage", label: "Homepage", description: "Section toggles and copy blocks." },
  { id: "seo", label: "SEO", description: "Default metadata and organization details." },
  { id: "team", label: "Team Access", description: "Backend staff only: Admins, managers, and viewers." },
  { id: "discounts", label: "Discounts", description: "Offers, promo codes, and campaign controls." },
  { id: "audit", label: "Audit Trail", description: "Privileged changes and backend activity." },
] as const;

export default function SettingsManagement({ onBack, initialTab = "commerce" }: SettingsManagementProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<StorefrontSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const hasPanelAccess = hasAdminPanelAccess(user?.role);
  const canSave = canManageAdminSettings(user?.role);
  const hasSettingsAccess = canManageAdminSettings(user?.role);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!hasSettingsAccess) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      setLoading(true);

      try {
        const response = await fetch(apiUrl(`/api/admin/settings?ts=${Date.now()}`), {
          headers: {
            ...getAdminRequestHeaders(),
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
        });
        const data = await parseJsonResponse<{ success?: boolean; data?: Partial<StorefrontSettings>; error?: string }>(response);

        if (!response.ok || !data?.success) {
          setSettings(defaultSettings);
          setWarningMessage(data?.error || `Settings could not be loaded. Defaults are shown instead (${response.status}).`);
          setError(null);
          return;
        }

        setSettings({
          ...defaultSettings,
          ...data.data,
          shipping: { ...defaultSettings.shipping, ...data.data?.shipping },
          tax: { ...defaultSettings.tax, ...data.data?.tax },
          payment: { ...defaultSettings.payment, ...data.data?.payment },
          email: { ...defaultSettings.email, ...data.data?.email },
          inventory: { ...defaultSettings.inventory, ...data.data?.inventory },
          media: { ...defaultSettings.media, ...data.data?.media },
          homepage: { ...defaultSettings.homepage, ...data.data?.homepage },
          seo: { ...defaultSettings.seo, ...data.data?.seo },
        });
        setWarningMessage(null);
        setError(null);
      } catch (fetchError) {
        setSettings(defaultSettings);
        setWarningMessage(getNetworkErrorMessage(fetchError, "Failed to load storefront settings. Showing defaults instead."));
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, [hasSettingsAccess]);

  const updateSection = <K extends keyof StorefrontSettings>(
    section: K,
    key: keyof StorefrontSettings[K],
    value: StorefrontSettings[K][keyof StorefrontSettings[K]]
  ) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
    setSuccessMessage(null);
    setWarningMessage(null);
  };

  const updatePromoBlock = (index: number, key: keyof StorefrontSettings["homepage"]["promoBlocks"][number], value: string) => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        promoBlocks: current.homepage.promoBlocks.map((block, blockIndex) =>
          blockIndex === index ? { ...block, [key]: value } : block
        ),
      },
    }));
  };

  const updatePromiseItem = (index: number, key: keyof StorefrontSettings["homepage"]["promiseItems"][number], value: string) => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        promiseItems: current.homepage.promiseItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item
        ),
      },
    }));
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/admin/settings?ts=${Date.now()}`), {
        method: "POST",
        headers: {
          ...getAdminRequestHeaders({ json: true }),
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
        body: JSON.stringify(settings),
      });
      const data = await parseJsonResponse<{ success?: boolean; data?: Partial<StorefrontSettings>; error?: string; message?: string }>(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Failed to save storefront settings (${response.status})`);
      }

      setSettings({
        ...defaultSettings,
        ...data.data,
        shipping: { ...defaultSettings.shipping, ...data.data?.shipping },
        tax: { ...defaultSettings.tax, ...data.data?.tax },
        payment: { ...defaultSettings.payment, ...data.data?.payment },
        email: { ...defaultSettings.email, ...data.data?.email },
        inventory: { ...defaultSettings.inventory, ...data.data?.inventory },
        media: { ...defaultSettings.media, ...data.data?.media },
        homepage: { ...defaultSettings.homepage, ...data.data?.homepage },
        seo: { ...defaultSettings.seo, ...data.data?.seo },
      });
      setSuccessMessage(data.message || "Settings saved.");
    } catch (saveError) {
      setError(getNetworkErrorMessage(saveError, "Failed to save storefront settings"));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#c8a830] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading settings access...</p>
        </div>
      </div>
    );
  }

  if (!hasPanelAccess || !hasSettingsAccess) {
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">SETTINGS CENTER</p>
          <h1
            className="mt-4 text-4xl font-light text-[#111]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Only Admin users can open the Settings Center.
          </p>
          <button
            onClick={onBack}
            className="mt-6 border border-gray-300 px-5 py-3 text-[11px] tracking-[0.18em] text-gray-700 transition-colors hover:border-[#c8a830] hover:text-[#8b6b12]"
          >
            BACK
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
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">STOREFRONT CONTROL</p>
            <h1
              className="mt-3 text-4xl font-light md:text-5xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Settings Center
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              A cleaner tabbed layout for storefront controls, backend team access, homepage copy, and SEO defaults.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/15 px-4 py-2 text-[11px] tracking-[0.18em] text-white/80">
              {getRoleLabel(user?.role)}
            </span>
            <button
              onClick={onBack}
              className="border border-white/20 px-4 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:border-[#d8c06a] hover:text-[#d8c06a]"
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-6 py-8 lg:px-10">
        {error && <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {warningMessage && (
          <div className="mb-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warningMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border border-black/10 bg-white p-5 h-fit">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Tabs</p>
            <div className="mt-4 space-y-2">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full border px-4 py-4 text-left transition-colors ${
                    activeTab === tab.id
                      ? "border-[#d8c06a] bg-[#fbf7ea]"
                      : "border-black/10 bg-white hover:border-[#d8c06a]"
                  }`}
                >
                  <p className="text-sm font-medium text-[#111]">{tab.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{tab.description}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="border border-black/10 bg-white">
            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-gray-500">Loading settings...</div>
            ) : activeTab === "team" ? (
              <div className="p-6">
                <UserManagement embedded />
              </div>
            ) : activeTab === "discounts" ? (
              <div className="p-6">
                <DiscountManagement embedded />
              </div>
            ) : activeTab === "audit" ? (
              <div className="p-6">
                <AuditLogManagement embedded />
              </div>
            ) : (
              <fieldset disabled={!canSave} className="space-y-6 p-6 disabled:opacity-90">
                {activeTab === "commerce" && (
                  <>
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                      <section className="border border-black/10 bg-[#fbfaf6] p-5">
                        <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          Shipping
                        </h2>
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <TextField label="Currency" value={settings.shipping.currency} onChange={(value) => updateSection("shipping", "currency", value.toUpperCase())} />
                          <TextField label="Shipping Label" value={settings.shipping.shippingLabel} onChange={(value) => updateSection("shipping", "shippingLabel", value)} />
                          <TextField label="Free Shipping Threshold" value={settings.shipping.freeShippingThreshold} onChange={(value) => updateSection("shipping", "freeShippingThreshold", Number(value))} type="number" />
                          <TextField label="Standard Shipping Cost" value={settings.shipping.standardShippingCost} onChange={(value) => updateSection("shipping", "standardShippingCost", Number(value))} type="number" />
                          <div className="md:col-span-2">
                            <TextField label="Estimated Delivery" value={settings.shipping.estimatedDelivery} onChange={(value) => updateSection("shipping", "estimatedDelivery", value)} />
                          </div>
                        </div>
                      </section>

                      <section className="border border-black/10 bg-[#fbfaf6] p-5">
                        <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          Tax
                        </h2>
                        <div className="mt-5 space-y-4">
                          <ToggleField
                            label="Enable Tax"
                            description="Apply a tax percentage during checkout."
                            checked={settings.tax.enabled}
                            onChange={(checked) => updateSection("tax", "enabled", checked)}
                            disabled={!canSave}
                          />
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <TextField label="Tax Label" value={settings.tax.taxLabel} onChange={(value) => updateSection("tax", "taxLabel", value)} />
                            <TextField label="Tax Rate (%)" value={settings.tax.taxRate} onChange={(value) => updateSection("tax", "taxRate", Number(value))} type="number" />
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                      <section className="border border-black/10 bg-[#fbfaf6] p-5">
                        <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          Payment
                        </h2>
                        <div className="mt-5 space-y-4">
                          <div className="border border-[#d8c06a]/40 bg-[#fbf7ea] px-4 py-3 text-sm text-[#6f5a17]">
                            Test mode keeps checkout in sandbox. Live mode uses the live API credentials saved below.
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className={sectionLabelClass}>Payment Mode</span>
                              <select
                                value={settings.payment.paymentMode}
                                onChange={(event) => updateSection("payment", "paymentMode", event.target.value as "live" | "test")}
                                className={inputClass}
                              >
                                <option value="live">Live</option>
                                <option value="test">Test</option>
                              </select>
                            </label>
                            <TextField label="Provider Name" value={settings.payment.providerName} onChange={(value) => updateSection("payment", "providerName", value)} />
                          </div>
                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div className="border border-black/10 bg-white p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Live API Credentials</p>
                              <div className="mt-4 grid grid-cols-1 gap-4">
                                <TextField label="Live Public Key" value={settings.payment.livePublicKey} onChange={(value) => updateSection("payment", "livePublicKey", value)} />
                                <TextField label="Live Secret Key" value={settings.payment.liveSecretKey} onChange={(value) => updateSection("payment", "liveSecretKey", value)} type="password" />
                              </div>
                            </div>
                            <div className="border border-black/10 bg-white p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Test API Credentials</p>
                              <div className="mt-4 grid grid-cols-1 gap-4">
                                <TextField label="Test Public Key" value={settings.payment.testPublicKey} onChange={(value) => updateSection("payment", "testPublicKey", value)} />
                                <TextField label="Test Secret Key" value={settings.payment.testSecretKey} onChange={(value) => updateSection("payment", "testSecretKey", value)} type="password" />
                              </div>
                            </div>
                          </div>
                          <TextField label="Webhook Secret" value={settings.payment.webhookSecret} onChange={(value) => updateSection("payment", "webhookSecret", value)} type="password" />
                          <ToggleField
                            label="Allow Guest Checkout"
                            description="If disabled, only signed-in customers can complete checkout."
                            checked={settings.payment.guestCheckoutEnabled}
                            onChange={(checked) => updateSection("payment", "guestCheckoutEnabled", checked)}
                            disabled={!canSave}
                          />
                          <label className="block">
                            <span className={sectionLabelClass}>Checkout Notice</span>
                            <textarea
                              value={settings.payment.checkoutNotice}
                              onChange={(event) => updateSection("payment", "checkoutNotice", event.target.value)}
                              rows={4}
                              className={textareaClass}
                            />
                          </label>
                        </div>
                      </section>

                      <section className="border border-black/10 bg-[#fbfaf6] p-5">
                        <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          Email Delivery
                        </h2>
                        <div className="mt-5 space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <TextField label="Provider Name" value={settings.email.providerName} onChange={(value) => updateSection("email", "providerName", value)} />
                            <TextField label="From Name" value={settings.email.fromName} onChange={(value) => updateSection("email", "fromName", value)} />
                            <TextField label="From Address" value={settings.email.fromAddress} onChange={(value) => updateSection("email", "fromAddress", value)} type="email" />
                            <TextField label="Reply-To Address" value={settings.email.replyToAddress} onChange={(value) => updateSection("email", "replyToAddress", value)} type="email" />
                            <TextField label="SMTP Host" value={settings.email.smtpHost} onChange={(value) => updateSection("email", "smtpHost", value)} />
                            <TextField label="SMTP Port" value={settings.email.smtpPort} onChange={(value) => updateSection("email", "smtpPort", Number(value))} type="number" />
                            <TextField label="SMTP User" value={settings.email.smtpUser} onChange={(value) => updateSection("email", "smtpUser", value)} />
                            <TextField label="SMTP Password" value={settings.email.smtpPass} onChange={(value) => updateSection("email", "smtpPass", value)} type="password" />
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <ToggleField
                              label="Use Secure SMTP"
                              description="Enable TLS-only SMTP, typically for port 465."
                              checked={settings.email.secure}
                              onChange={(checked) => updateSection("email", "secure", checked)}
                              disabled={!canSave}
                            />
                            <div className="border border-[#d8c06a]/30 bg-[#fbf7ea] px-4 py-3 text-xs text-[#6f5a17]">
                              These settings drive transactional email delivery and sender identity for customer notifications.
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <ToggleField
                              label="Order Confirmations"
                              description="Send customer order confirmation emails."
                              checked={settings.email.orderConfirmationEnabled}
                              onChange={(checked) => updateSection("email", "orderConfirmationEnabled", checked)}
                              disabled={!canSave}
                            />
                            <ToggleField
                              label="Shipping Updates"
                              description="Send dispatch and shipping progress emails."
                              checked={settings.email.shippingUpdateEnabled}
                              onChange={(checked) => updateSection("email", "shippingUpdateEnabled", checked)}
                              disabled={!canSave}
                            />
                            <ToggleField
                              label="Newsletter Mail"
                              description="Allow newsletter and campaign sends."
                              checked={settings.email.newsletterEnabled}
                              onChange={(checked) => updateSection("email", "newsletterEnabled", checked)}
                              disabled={!canSave}
                            />
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                      <section className="border border-black/10 bg-[#fbfaf6] p-5">
                        <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          Inventory
                        </h2>
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <TextField label="Low Stock Threshold" value={settings.inventory.lowStockThreshold} onChange={(value) => updateSection("inventory", "lowStockThreshold", Number(value))} type="number" />
                        </div>
                      </section>

                      <section className="border border-black/10 bg-[#fbfaf6] p-5">
                        <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          Media Storage
                        </h2>
                        <div className="mt-5 space-y-4">
                          <div className="border border-[#d8c06a]/40 bg-[#fbf7ea] px-4 py-3 text-sm text-[#6f5a17]">
                            Admin uploads and media deletions are now restricted to Admin and Manager accounts. Use Cloudinary in production so uploads survive deploys and restarts.
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className={sectionLabelClass}>Upload Storage</span>
                              <select
                                value={settings.media.uploadStorage}
                                onChange={(event) => updateSection("media", "uploadStorage", event.target.value as "local" | "cloudinary")}
                                className={inputClass}
                              >
                                <option value="local">Local</option>
                                <option value="cloudinary">Cloudinary</option>
                              </select>
                            </label>
                            <TextField
                              label="Backend Public URL"
                              value={settings.media.backendPublicUrl}
                              onChange={(value) => updateSection("media", "backendPublicUrl", value)}
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <div className="border border-black/10 bg-white p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Cloudinary Credentials</p>
                              <div className="mt-4 grid grid-cols-1 gap-4">
                                <TextField
                                  label="Cloud Name"
                                  value={settings.media.cloudinaryCloudName}
                                  onChange={(value) => updateSection("media", "cloudinaryCloudName", value)}
                                />
                                <TextField
                                  label="API Key"
                                  value={settings.media.cloudinaryApiKey}
                                  onChange={(value) => updateSection("media", "cloudinaryApiKey", value)}
                                />
                                <TextField
                                  label="API Secret"
                                  value={settings.media.cloudinaryApiSecret}
                                  onChange={(value) => updateSection("media", "cloudinaryApiSecret", value)}
                                  type="password"
                                />
                              </div>
                            </div>
                            <div className="border border-black/10 bg-white p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Upload Defaults</p>
                              <div className="mt-4 grid grid-cols-1 gap-4">
                                <TextField
                                  label="Cloudinary Folder"
                                  value={settings.media.cloudinaryFolder}
                                  onChange={(value) => updateSection("media", "cloudinaryFolder", value)}
                                />
                                <div className="border border-black/10 bg-[#f8f6f0] px-4 py-3 text-xs text-gray-600">
                                  Set the backend public URL when you use local storage behind a separate frontend domain. For Firebase App Hosting, this should be your live API base URL.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </>
                )}

                {activeTab === "homepage" && (
                  <>
                    <section className="border border-black/10 bg-[#fbfaf6] p-5">
                      <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Homepage Sections
                      </h2>
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ToggleField label="Category Showcase" description="Show browse-by-style cards." checked={settings.homepage.showCategoryShowcase} onChange={(checked) => updateSection("homepage", "showCategoryShowcase", checked)} disabled={!canSave} />
                        <ToggleField label="Featured Products" description="Show the featured works grid." checked={settings.homepage.showFeatured} onChange={(checked) => updateSection("homepage", "showFeatured", checked)} disabled={!canSave} />
                        <ToggleField label="Editorial Banner" description="Show the brand philosophy block." checked={settings.homepage.showEditorial} onChange={(checked) => updateSection("homepage", "showEditorial", checked)} disabled={!canSave} />
                        <ToggleField label="Promo Blocks" description="Show editorial promo cards." checked={settings.homepage.showPromoGrid} onChange={(checked) => updateSection("homepage", "showPromoGrid", checked)} disabled={!canSave} />
                        <ToggleField label="New Arrivals" description="Show the new arrivals grid." checked={settings.homepage.showNewArrivals} onChange={(checked) => updateSection("homepage", "showNewArrivals", checked)} disabled={!canSave} />
                        <ToggleField label="Promise Section" description="Show the service promise section." checked={settings.homepage.showPromise} onChange={(checked) => updateSection("homepage", "showPromise", checked)} disabled={!canSave} />
                      </div>
                    </section>

                    <section className="border border-black/10 bg-[#fbfaf6] p-5">
                      <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Hero and Editorial
                      </h2>
                      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <TextField label="Hero Eyebrow" value={settings.homepage.heroEyebrow} onChange={(value) => updateSection("homepage", "heroEyebrow", value)} />
                        <TextField label="Hero Line One" value={settings.homepage.heroLineOne} onChange={(value) => updateSection("homepage", "heroLineOne", value)} />
                        <TextField label="Hero Line Two" value={settings.homepage.heroLineTwo} onChange={(value) => updateSection("homepage", "heroLineTwo", value)} />
                        <TextField label="Hero Line Three" value={settings.homepage.heroLineThree} onChange={(value) => updateSection("homepage", "heroLineThree", value)} />
                        <TextField label="Hero Background Image" value={settings.homepage.heroBackgroundImage} onChange={(value) => updateSection("homepage", "heroBackgroundImage", value)} />
                        <TextField label="Featured Eyebrow" value={settings.homepage.featuredEyebrow} onChange={(value) => updateSection("homepage", "featuredEyebrow", value)} />
                        <TextField label="Featured Heading" value={settings.homepage.featuredHeading} onChange={(value) => updateSection("homepage", "featuredHeading", value)} />
                        <TextField label="New Arrivals Eyebrow" value={settings.homepage.newArrivalsEyebrow} onChange={(value) => updateSection("homepage", "newArrivalsEyebrow", value)} />
                        <TextField label="New Arrivals Heading" value={settings.homepage.newArrivalsHeading} onChange={(value) => updateSection("homepage", "newArrivalsHeading", value)} />
                        <TextField label="Editorial Eyebrow" value={settings.homepage.editorialEyebrow} onChange={(value) => updateSection("homepage", "editorialEyebrow", value)} />
                        <TextField label="Editorial Heading" value={settings.homepage.editorialHeading} onChange={(value) => updateSection("homepage", "editorialHeading", value)} />
                        <TextField label="Editorial Background Image" value={settings.homepage.editorialBackgroundImage} onChange={(value) => updateSection("homepage", "editorialBackgroundImage", value)} />
                        <TextField label="Promo Eyebrow" value={settings.homepage.promoEyebrow} onChange={(value) => updateSection("homepage", "promoEyebrow", value)} />
                        <TextField label="Promo Heading" value={settings.homepage.promoHeading} onChange={(value) => updateSection("homepage", "promoHeading", value)} />
                        <TextField label="Promise Eyebrow" value={settings.homepage.promiseEyebrow} onChange={(value) => updateSection("homepage", "promiseEyebrow", value)} />
                        <TextField label="Promise Heading" value={settings.homepage.promiseHeading} onChange={(value) => updateSection("homepage", "promiseHeading", value)} />
                        <label className="block md:col-span-2">
                          <span className={sectionLabelClass}>Hero Tagline</span>
                          <textarea value={settings.homepage.heroTagline} onChange={(event) => updateSection("homepage", "heroTagline", event.target.value)} rows={3} className={textareaClass} />
                        </label>
                        <label className="block md:col-span-2">
                          <span className={sectionLabelClass}>Editorial Body</span>
                          <textarea value={settings.homepage.editorialBody} onChange={(event) => updateSection("homepage", "editorialBody", event.target.value)} rows={5} className={textareaClass} />
                        </label>
                      </div>
                    </section>

                    <section className="border border-black/10 bg-[#fbfaf6] p-5">
                      <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Promo Blocks
                      </h2>
                      <div className="mt-5 space-y-4">
                        {settings.homepage.promoBlocks.map((block, index) => (
                          <div key={`promo-${index}`} className="grid grid-cols-1 gap-4 border border-black/10 bg-white p-4 md:grid-cols-2">
                            <TextField label={`Promo ${index + 1} Eyebrow`} value={block.eyebrow} onChange={(value) => updatePromoBlock(index, "eyebrow", value)} />
                            <TextField label={`Promo ${index + 1} CTA Page`} value={block.ctaPage} onChange={(value) => updatePromoBlock(index, "ctaPage", value)} />
                            <div className="md:col-span-2">
                              <TextField label={`Promo ${index + 1} Title`} value={block.title} onChange={(value) => updatePromoBlock(index, "title", value)} />
                            </div>
                            <div className="md:col-span-2">
                              <TextField label={`Promo ${index + 1} Image URL`} value={block.image} onChange={(value) => updatePromoBlock(index, "image", value)} />
                            </div>
                            <TextField label={`Promo ${index + 1} CTA Label`} value={block.ctaLabel} onChange={(value) => updatePromoBlock(index, "ctaLabel", value)} />
                            <label className="block md:col-span-2">
                              <span className={sectionLabelClass}>Promo {index + 1} Body</span>
                              <textarea value={block.body} onChange={(event) => updatePromoBlock(index, "body", event.target.value)} rows={3} className={textareaClass} />
                            </label>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="border border-black/10 bg-[#fbfaf6] p-5">
                      <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Promise Cards
                      </h2>
                      <div className="mt-5 space-y-4">
                        {settings.homepage.promiseItems.map((item, index) => (
                          <div key={`promise-${index}`} className="grid grid-cols-1 gap-4 border border-black/10 bg-white p-4 md:grid-cols-2">
                            <TextField label={`Promise ${index + 1} Title`} value={item.title} onChange={(value) => updatePromiseItem(index, "title", value)} />
                            <label className="block md:col-span-2">
                              <span className={sectionLabelClass}>Promise {index + 1} Description</span>
                              <textarea value={item.description} onChange={(event) => updatePromiseItem(index, "description", event.target.value)} rows={3} className={textareaClass} />
                            </label>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {activeTab === "seo" && (
                  <section className="border border-black/10 bg-[#fbfaf6] p-5">
                    <h2 className="text-2xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      SEO Defaults
                    </h2>
                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <TextField label="Site Name" value={settings.seo.siteName} onChange={(value) => updateSection("seo", "siteName", value)} />
                      <TextField label="Locale" value={settings.seo.locale} onChange={(value) => updateSection("seo", "locale", value)} />
                      <TextField label="Default Title" value={settings.seo.defaultTitle} onChange={(value) => updateSection("seo", "defaultTitle", value)} />
                      <TextField label="Default Image URL" value={settings.seo.defaultImage} onChange={(value) => updateSection("seo", "defaultImage", value)} />
                      <TextField label="Organization Name" value={settings.seo.organizationName} onChange={(value) => updateSection("seo", "organizationName", value)} />
                      <TextField label="Organization Email" value={settings.seo.organizationEmail} onChange={(value) => updateSection("seo", "organizationEmail", value)} type="email" />
                      <TextField label="Organization Phone" value={settings.seo.organizationPhone} onChange={(value) => updateSection("seo", "organizationPhone", value)} />
                      <TextField label="Organization Country" value={settings.seo.organizationCountry} onChange={(value) => updateSection("seo", "organizationCountry", value.toUpperCase())} />
                      <TextField label="Organization City" value={settings.seo.organizationCity} onChange={(value) => updateSection("seo", "organizationCity", value)} />
                      <TextField label="Slogan" value={settings.seo.slogan} onChange={(value) => updateSection("seo", "slogan", value)} />
                      <label className="block md:col-span-2">
                        <span className={sectionLabelClass}>Default Description</span>
                        <textarea value={settings.seo.defaultDescription} onChange={(event) => updateSection("seo", "defaultDescription", event.target.value)} rows={4} className={textareaClass} />
                      </label>
                      <label className="block md:col-span-2">
                        <span className={sectionLabelClass}>Default Keywords</span>
                        <textarea value={settings.seo.defaultKeywords} onChange={(event) => updateSection("seo", "defaultKeywords", event.target.value)} rows={3} className={textareaClass} />
                      </label>
                    </div>
                  </section>
                )}
              </fieldset>
            )}
          </section>
        </div>

        <div className={`sticky bottom-0 mt-6 border border-black/10 bg-white/95 px-5 py-4 backdrop-blur ${activeTab === "team" || activeTab === "discounts" || activeTab === "audit" ? "hidden" : ""}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
              {canSave ? "Review changes and save when ready" : "Read-only preview for this role"}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !canSave}
              className="bg-[#111] px-6 py-3 text-[11px] tracking-[0.18em] text-white transition-colors hover:bg-[#c8a830] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "SAVING..." : "SAVE SETTINGS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
