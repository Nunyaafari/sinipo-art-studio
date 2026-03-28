const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim() || "";

let safeResponseJsonInstalled = false;

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = configuredApiBase.replace(/\/$/, "");

  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
};

export const assetUrl = (path: string): string => {
  if (!path) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    try {
      const parsedUrl = new URL(path);
      const isLocalUpload =
        parsedUrl.pathname.startsWith('/uploads/') &&
        (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1');

      if (isLocalUpload) {
        return apiUrl(`${parsedUrl.pathname}${parsedUrl.search}`);
      }
    } catch {
      return path;
    }

    return path;
  }

  return apiUrl(path);
};

export const parseJsonResponse = async <T = unknown>(response: Response): Promise<T | null> => {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(`Invalid server response (${response.status})`);
  }
};

export const installSafeResponseJson = () => {
  if (safeResponseJsonInstalled || typeof Response === "undefined") {
    return;
  }

  const originalText = Response.prototype.text;

  Response.prototype.json = async function safeJson(): Promise<unknown> {
    const responseText = await originalText.call(this);

    if (!responseText.trim()) {
      return {};
    }

    return JSON.parse(responseText);
  };

  safeResponseJsonInstalled = true;
};

export const getNetworkErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof TypeError) {
    return "Backend server is unreachable. Start the backend and try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
