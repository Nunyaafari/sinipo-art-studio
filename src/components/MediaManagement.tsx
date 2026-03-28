import { useEffect, useMemo, useState } from "react";
import FileUpload from "./FileUpload";
import { useAuth } from "../contexts/AuthContext";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import {
  canEditAdminContent,
  getAdminRequestHeaders,
  getRoleLabel,
  hasAdminPanelAccess
} from "../lib/admin";
import { MediaAsset, getMediaSelectionsFromUpload } from "../lib/media";

interface MediaManagementProps {
  onBack: () => void;
}

const mediaTypeOptions = [
  { value: "all", label: "All Media" },
  { value: "artwork", label: "Artwork" },
  { value: "blog", label: "Blog" },
  { value: "general", label: "General" },
  { value: "avatar", label: "Avatar" },
] as const;

const formatBytes = (value: number | null) => {
  if (!value) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export default function MediaManagement({ onBack }: MediaManagementProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof mediaTypeOptions)[number]["value"]>("all");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    altText: "",
    type: "general" as MediaAsset["type"],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasPanelAccess = hasAdminPanelAccess(user?.role);
  const canEdit = canEditAdminContent(user?.role);

  useEffect(() => {
    if (!hasPanelAccess) {
      setLoading(false);
      return;
    }

    const fetchAssets = async () => {
      setLoading(true);

      try {
        const query = new URLSearchParams();
        query.set("type", filter);
        if (search.trim()) {
          query.set("search", search.trim());
        }

        const response = await fetch(apiUrl(`/api/admin/media?${query.toString()}`), {
          headers: getAdminRequestHeaders(),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load media assets");
        }

        const nextAssets = Array.isArray(data.data) ? data.data : [];
        setAssets(nextAssets);
        setError(null);

        setSelectedAssetId((current) => {
          if (current && nextAssets.some((asset) => asset.id === current)) {
            return current;
          }

          return nextAssets[0]?.id ?? null;
        });
      } catch (fetchError) {
        setError(getNetworkErrorMessage(fetchError, "Failed to load media assets"));
      } finally {
        setLoading(false);
      }
    };

    void fetchAssets();
  }, [filter, hasPanelAccess, refreshKey, search]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    setFormState({
      title: selectedAsset.title || "",
      altText: selectedAsset.altText || "",
      type: selectedAsset.type,
    });
  }, [selectedAsset]);

  const handleUpload = (result: unknown) => {
    const uploadedSelections = getMediaSelectionsFromUpload(result);
    const uploadedAssetId = uploadedSelections.find((selection) => typeof selection.assetId === "number")?.assetId ?? null;

    if (uploadedAssetId) {
      setSelectedAssetId(uploadedAssetId);
    }

    setRefreshKey((current) => current + 1);
  };

  const handleSave = async () => {
    if (!selectedAsset || !canEdit) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(apiUrl(`/api/admin/media/${selectedAsset.id}`), {
        method: "PATCH",
        headers: getAdminRequestHeaders({ json: true }),
        body: JSON.stringify(formState),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update media asset");
      }

      setRefreshKey((current) => current + 1);
      setError(null);
    } catch (saveError) {
      setError(getNetworkErrorMessage(saveError, "Failed to update media asset"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset || !canEdit) {
      return;
    }

    if (!window.confirm("Delete this media asset? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(apiUrl(`/api/admin/media/${selectedAsset.id}`), {
        method: "DELETE",
        headers: getAdminRequestHeaders(),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete media asset");
      }

      setSelectedAssetId(null);
      setRefreshKey((current) => current + 1);
      setError(null);
    } catch (deleteError) {
      setError(getNetworkErrorMessage(deleteError, "Failed to delete media asset"));
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
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
    return (
      <div className="min-h-screen bg-[#f6f3ec] pt-28 px-6">
        <div className="mx-auto max-w-3xl border border-black/10 bg-white p-10 text-center">
          <p className="text-xs tracking-[0.35em] text-[#8b6b12]">MEDIA MANAGEMENT</p>
          <h1 className="mt-4 text-4xl font-light text-[#111]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Admin access required
          </h1>
          <p className="mt-4 text-sm text-gray-600">
            Sign in with a backend role to review the media library.
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
            <p className="text-xs tracking-[0.35em] text-[#d8c06a]">MEDIA LIBRARY</p>
            <h1 className="mt-3 text-4xl font-light md:text-5xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Media Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Keep upload metadata clean, reusable, and easier to manage across products and editorial.
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

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 py-10">
        {!canEdit && (
          <div className="mb-6 border border-[#d8c06a]/30 bg-[#fbf7ea] px-4 py-3 text-sm text-[#6f5a17]">
            You are in view-only mode. Uploading, editing metadata, and deleting assets is disabled.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_360px] gap-6">
          <aside className="bg-white border border-gray-100 p-5 h-fit">
            <div className="mb-5">
              <p
                className="text-xs tracking-[0.2em] text-gray-400 mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                SEARCH
              </p>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, alt text, or URL"
                className="w-full border border-gray-200 px-4 py-3 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            <div className="mb-5">
              <p
                className="text-xs tracking-[0.2em] text-gray-400 mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                FILTER
              </p>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as (typeof mediaTypeOptions)[number]["value"])}
                className="w-full border border-gray-200 px-4 py-3 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
              >
                {mediaTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {canEdit && (
              <div className="mb-5">
                <p
                  className="text-xs tracking-[0.2em] text-gray-400 mb-2"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  QUICK UPLOAD
                </p>
                <FileUpload
                  onUpload={handleUpload}
                  onError={(uploadError) => setError(uploadError)}
                  type={filter === "all" ? "general" : filter}
                  multiple
                >
                  <div className="border border-dashed border-gray-300 bg-[#fbfaf6] p-5 text-center">
                    <p className="text-sm text-[#0a0a0a]">Upload new media</p>
                    <p className="text-xs text-gray-400 mt-1">Products and blog can reuse the same assets</p>
                  </div>
                </FileUpload>
              </div>
            )}

            <div className="border border-gray-200 bg-[#fbfaf6] p-4">
              <p
                className="text-xs tracking-[0.2em] text-gray-400 mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                LIBRARY STATUS
              </p>
              <p className="text-3xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {assets.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">assets in this view</p>
            </div>

            {error && <p className="text-xs text-red-600 mt-4">{error}</p>}
          </aside>

          <section className="bg-white border border-gray-100 min-h-[720px]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
              <div>
                <h2
                  className="text-2xl font-light text-[#0a0a0a]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Library Assets
                </h2>
                <p className="text-sm text-gray-500 mt-1">Select an asset to update metadata or review where it is used.</p>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="h-[600px] flex items-center justify-center text-sm text-gray-500">
                  Loading media assets...
                </div>
              ) : assets.length === 0 ? (
                <div className="h-[600px] flex items-center justify-center text-sm text-gray-500">
                  No media assets found for this view.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {assets.map((asset) => {
                    const selected = asset.id === selectedAssetId;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={`border text-left transition-colors ${
                          selected
                            ? "border-[#c8a830] bg-[#fff8de]"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        }`}
                      >
                        <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                          <img
                            src={assetUrl(asset.url)}
                            alt={asset.altText || asset.title || "Media asset"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                              {asset.type}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Used {asset.usageCount ?? 0}x
                            </span>
                          </div>
                          <p className="text-sm text-[#0a0a0a] truncate mt-2">
                            {asset.title || "Untitled asset"}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-1">{asset.url}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="bg-white border border-gray-100 p-6 h-fit xl:sticky xl:top-32">
            {selectedAsset ? (
              <>
                <div className="aspect-[4/3] bg-gray-50 overflow-hidden border border-gray-100 mb-5">
                  <img
                    src={assetUrl(selectedAsset.url)}
                    alt={selectedAsset.altText || selectedAsset.title || "Selected media asset"}
                    className="w-full h-full object-cover"
                  />
                </div>

                <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-90">
                  <div>
                    <label
                      className="text-xs tracking-[0.2em] text-gray-400 block mb-2"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      TITLE
                    </label>
                    <input
                      type="text"
                      value={formState.title}
                      onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                      className="w-full border border-gray-200 px-4 py-3 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      className="text-xs tracking-[0.2em] text-gray-400 block mb-2"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      ALT TEXT
                    </label>
                    <textarea
                      value={formState.altText}
                      onChange={(event) => setFormState((current) => ({ ...current, altText: event.target.value }))}
                      rows={3}
                      className="w-full border border-gray-200 px-4 py-3 text-sm bg-white focus:border-[#c8a830] focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label
                      className="text-xs tracking-[0.2em] text-gray-400 block mb-2"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      TYPE
                    </label>
                    <select
                      value={formState.type}
                      onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value as MediaAsset["type"] }))}
                      className="w-full border border-gray-200 px-4 py-3 text-sm bg-white focus:border-[#c8a830] focus:outline-none"
                    >
                      {mediaTypeOptions.filter((option) => option.value !== "all").map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </fieldset>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="border border-gray-100 p-3">
                    <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1">STORAGE</p>
                    <p className="text-[#0a0a0a]">{selectedAsset.storageType}</p>
                  </div>
                  <div className="border border-gray-100 p-3">
                    <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1">SIZE</p>
                    <p className="text-[#0a0a0a]">{formatBytes(selectedAsset.size)}</p>
                  </div>
                  <div className="border border-gray-100 p-3">
                    <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1">DIMENSIONS</p>
                    <p className="text-[#0a0a0a]">
                      {selectedAsset.width && selectedAsset.height
                        ? `${selectedAsset.width} × ${selectedAsset.height}`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="border border-gray-100 p-3">
                    <p className="text-[11px] tracking-[0.18em] text-gray-400 mb-1">USAGE</p>
                    <p className="text-[#0a0a0a]">{selectedAsset.usageCount ?? 0} placements</p>
                  </div>
                </div>

                <div className="mt-6">
                  <p
                    className="text-xs tracking-[0.2em] text-gray-400 mb-3"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    USED IN
                  </p>
                  <div className="space-y-3 text-sm text-gray-600">
                    {selectedAsset.usage?.artworks?.length ? (
                      <div>
                        <p className="text-[#0a0a0a] mb-1">Products</p>
                        <div className="space-y-1">
                          {selectedAsset.usage.artworks.map((artwork) => (
                            <p key={`artwork-${artwork.id}`}>{artwork.title}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selectedAsset.usage?.blogPosts?.length ? (
                      <div>
                        <p className="text-[#0a0a0a] mb-1">Blog Posts</p>
                        <div className="space-y-1">
                          {selectedAsset.usage.blogPosts.map((post) => (
                            <p key={`blog-${post.id}`}>{post.title}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {!selectedAsset.usage?.artworks?.length && !selectedAsset.usage?.blogPosts?.length ? (
                      <p className="text-gray-400">This asset is not currently linked to any product or blog post.</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !canEdit}
                    className="w-full bg-[#1b1b1d] text-white px-5 py-3 text-[11px] tracking-[0.18em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {saving ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting || !canEdit || (selectedAsset.usageCount ?? 0) > 0}
                    className="w-full border border-red-200 text-red-600 px-5 py-3 text-[11px] tracking-[0.18em] hover:border-red-400 transition-colors disabled:opacity-50"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {deleting ? "DELETING..." : "DELETE ASSET"}
                  </button>
                  {(selectedAsset.usageCount ?? 0) > 0 ? (
                    <p className="text-xs text-gray-400">
                      Remove this asset from products or blog posts before deleting it.
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-16">
                Select a media asset to view its details.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
