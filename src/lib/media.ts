export interface MediaAsset {
  id: number;
  url: string;
  type: "artwork" | "blog" | "general" | "avatar";
  title: string;
  altText: string;
  mimeType: string;
  size: number | null;
  width: number | null;
  height: number | null;
  storageType: string;
  publicId: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  usage?: {
    artworks: Array<{ id: number; title: string }>;
    blogPosts: Array<{ id: number; title: string }>;
  };
}

export interface MediaSelection {
  url: string;
  assetId?: number | null;
}

const isMediaAsset = (value: unknown): value is MediaAsset => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "number" &&
    "url" in value &&
    typeof value.url === "string"
  );
};

export const getMediaSelectionsFromUpload = (result: unknown): MediaSelection[] => {
  const uploads = Array.isArray(result) ? result : [result];
  const seen = new Set<string>();
  const selections: MediaSelection[] = [];

  uploads.forEach((upload) => {
    if (!upload || typeof upload !== "object") {
      return;
    }

    const directMediaAsset =
      "mediaAsset" in upload && isMediaAsset(upload.mediaAsset)
        ? upload.mediaAsset
        : "data" in upload &&
            upload.data &&
            typeof upload.data === "object" &&
            "mediaAsset" in upload.data &&
            isMediaAsset(upload.data.mediaAsset)
          ? upload.data.mediaAsset
          : null;

    const url =
      directMediaAsset?.url ||
      ("url" in upload && typeof upload.url === "string"
        ? upload.url
        : "cloudinary" in upload &&
            upload.cloudinary &&
            typeof upload.cloudinary === "object" &&
            "url" in upload.cloudinary &&
            typeof upload.cloudinary.url === "string"
          ? upload.cloudinary.url
          : "optimized" in upload &&
              upload.optimized &&
              typeof upload.optimized === "object" &&
              "path" in upload.optimized &&
              typeof upload.optimized.path === "string"
            ? upload.optimized.path
            : "original" in upload &&
                upload.original &&
                typeof upload.original === "object" &&
                "path" in upload.original &&
                typeof upload.original.path === "string"
              ? upload.original.path
              : null);

    if (!url || seen.has(url)) {
      return;
    }

    seen.add(url);
    selections.push({
      url,
      assetId: directMediaAsset?.id ?? null,
    });
  });

  return selections;
};
