import { useEffect, useMemo, useState } from "react";
import FileUpload from "./FileUpload";
import { apiUrl, assetUrl, getNetworkErrorMessage } from "../lib/api";
import { getAdminRequestHeaders } from "../lib/admin";
import { MediaAsset, getMediaSelectionsFromUpload } from "../lib/media";

interface MediaLibraryPickerProps {
  open: boolean;
  mode: "single" | "multiple";
  assetType: "artwork" | "blog" | "general";
  selectedIds?: number[];
  title?: string;
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
}

export default function MediaLibraryPicker({
  open,
  mode,
  assetType,
  selectedIds = [],
  title = "Media Library",
  onClose,
  onSelect,
}: MediaLibraryPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>(selectedIds);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPendingIds(selectedIds);
  }, [open, selectedIds]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fetchAssets = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("type", assetType);
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

        setAssets(Array.isArray(data.data) ? data.data : []);
        setError(null);
      } catch (fetchError) {
        setError(getNetworkErrorMessage(fetchError, "Failed to load media assets"));
      } finally {
        setLoading(false);
      }
    };

    void fetchAssets();
  }, [assetType, open, refreshKey, search]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => pendingIds.includes(asset.id)),
    [assets, pendingIds]
  );

  const toggleAsset = (assetId: number) => {
    setPendingIds((current) => {
      if (mode === "single") {
        return current.includes(assetId) ? [] : [assetId];
      }

      return current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId];
    });
  };

  const handleConfirm = () => {
    onSelect(selectedAssets);
    onClose();
  };

  const handleUpload = (result: unknown) => {
    const uploadedSelections = getMediaSelectionsFromUpload(result);
    if (uploadedSelections.length === 0) {
      return;
    }

    const uploadedIds = uploadedSelections
      .map((selection) => selection.assetId)
      .filter((assetId): assetId is number => typeof assetId === "number");

    if (uploadedIds.length > 0) {
      setPendingIds((current) => {
        if (mode === "single") {
          return [uploadedIds[0]];
        }

        return Array.from(new Set([...current, ...uploadedIds]));
      });
    }

    setSearch("");
    setRefreshKey((current) => current + 1);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl max-h-[88vh] overflow-hidden border border-black/10 shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div>
            <h3
              className="text-2xl font-light text-[#0a0a0a]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload new assets or reuse existing media across products and blog posts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-[#0a0a0a]"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            CLOSE
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] min-h-[560px]">
          <aside className="border-r border-gray-100 p-5 bg-[#fbfaf6]">
            <div className="mb-4">
              <label
                className="text-xs tracking-[0.2em] text-gray-400 block mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                SEARCH
              </label>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search media..."
                className="w-full border border-gray-200 px-4 py-3 text-sm focus:border-[#c8a830] focus:outline-none"
              />
            </div>

            <div className="mb-5">
              <label
                className="text-xs tracking-[0.2em] text-gray-400 block mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                QUICK UPLOAD
              </label>
              <FileUpload
                onUpload={handleUpload}
                onError={(uploadError) => setError(uploadError)}
                type={assetType}
                multiple={mode === "multiple"}
              >
                <div className="border border-dashed border-gray-300 bg-white p-4 text-center">
                  <p className="text-sm text-[#0a0a0a]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Upload into library
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Assets appear here after upload
                  </p>
                </div>
              </FileUpload>
            </div>

            <div className="border border-gray-200 bg-white p-4">
              <p
                className="text-xs tracking-[0.2em] text-gray-400 mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                SELECTION
              </p>
              <p className="text-sm text-gray-600">
                {selectedAssets.length} asset{selectedAssets.length === 1 ? "" : "s"} selected
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {mode === "single" ? "Choose one image" : "Choose one or more images"}
              </p>
            </div>

            {error && <p className="text-xs text-red-600 mt-4">{error}</p>}
          </aside>

          <div className="flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  Loading media assets...
                </div>
              ) : assets.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  No media assets found for this section yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {assets.map((asset) => {
                    const selected = pendingIds.includes(asset.id);

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAsset(asset.id)}
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
                          <p className="text-sm text-[#0a0a0a] truncate">
                            {asset.title || asset.url}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-1">{asset.url}</p>
                          <div className="flex items-center justify-between gap-2 mt-3">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                              {asset.type}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Used {asset.usageCount ?? 0}x
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="border border-gray-200 text-gray-600 px-5 py-2.5 text-[11px] tracking-[0.18em] hover:border-gray-400 transition-colors"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedAssets.length === 0}
                className="bg-[#1b1b1d] text-white px-5 py-2.5 text-[11px] tracking-[0.18em] hover:bg-[#c8a830] transition-colors disabled:opacity-50"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                USE SELECTED
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
