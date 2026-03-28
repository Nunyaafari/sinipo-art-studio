import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { apiUrl, parseJsonResponse } from "../lib/api";

interface WishlistContextType {
  wishlist: number[];
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (productId: number) => Promise<{ success: boolean; message: string }>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "sinipoWishlist";

const normalizeWishlist = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  return Array.from(new Set(normalized));
};

const loadStoredWishlist = (): number[] => {
  const rawValue = localStorage.getItem(WISHLIST_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    return normalizeWishlist(JSON.parse(rawValue));
  } catch {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
    return [];
  }
};

const persistWishlist = (wishlist: number[]) => {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
};

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [wishlist, setWishlist] = useState<number[]>(() => loadStoredWishlist());

  const fetchServerWishlist = useCallback(async () => {
    if (!token) {
      return loadStoredWishlist();
    }

    const response = await fetch(apiUrl("/api/user/wishlist"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await parseJsonResponse<{ success?: boolean; data?: unknown }>(response);
    if (!response.ok || !data?.success) {
      throw new Error("Failed to load wishlist");
    }

    return normalizeWishlist(data.data);
  }, [token]);

  const refreshWishlist = useCallback(async () => {
    if (!token) {
      const localWishlist = loadStoredWishlist();
      setWishlist(localWishlist);
      return;
    }

    const localWishlist = loadStoredWishlist();
    const serverWishlist = await fetchServerWishlist();
    const missingFromServer = localWishlist.filter((productId) => !serverWishlist.includes(productId));

    if (missingFromServer.length > 0) {
      await Promise.all(
        missingFromServer.map(async (productId) => {
          await fetch(apiUrl("/api/user/wishlist"), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productId }),
          });
        })
      );
    }

    const mergedWishlist =
      missingFromServer.length > 0
        ? Array.from(new Set([...serverWishlist, ...missingFromServer]))
        : serverWishlist;

    setWishlist(mergedWishlist);
    persistWishlist(mergedWishlist);
  }, [fetchServerWishlist, token]);

  useEffect(() => {
    let cancelled = false;

    const syncWishlist = async () => {
      try {
        if (!token) {
          if (!cancelled) {
            setWishlist(loadStoredWishlist());
          }
          return;
        }

        const serverWishlist = await fetchServerWishlist();
        const localWishlist = loadStoredWishlist();
        const missingFromServer = localWishlist.filter((productId) => !serverWishlist.includes(productId));
        const mergedWishlist = Array.from(new Set([...serverWishlist, ...missingFromServer]));

        if (!cancelled) {
          setWishlist(mergedWishlist);
          persistWishlist(mergedWishlist);
        }

        if (missingFromServer.length > 0) {
          await Promise.all(
            missingFromServer.map(async (productId) => {
              await fetch(apiUrl("/api/user/wishlist"), {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ productId }),
              });
            })
          );
        }
      } catch (error) {
        console.error("Failed to sync wishlist:", error);
        if (!cancelled) {
          setWishlist(loadStoredWishlist());
        }
      }
    };

    void syncWishlist();

    return () => {
      cancelled = true;
    };
  }, [fetchServerWishlist, token]);

  const toggleWishlist = useCallback(
    async (productId: number) => {
      const currentlyWishlisted = wishlist.includes(productId);
      const nextWishlist = currentlyWishlisted
        ? wishlist.filter((id) => id !== productId)
        : [...wishlist, productId];

      setWishlist(nextWishlist);
      persistWishlist(nextWishlist);

      if (!token) {
        return {
          success: true,
          message: currentlyWishlisted
            ? "Removed from wishlist on this device"
            : "Saved to wishlist on this device",
        };
      }

      try {
        const response = await fetch(
          currentlyWishlisted
            ? apiUrl(`/api/user/wishlist/${productId}`)
            : apiUrl("/api/user/wishlist"),
          {
            method: currentlyWishlisted ? "DELETE" : "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: currentlyWishlisted ? undefined : JSON.stringify({ productId }),
          }
        );

        const data = await parseJsonResponse<{ success?: boolean; error?: string }>(response);

        if (!response.ok || data?.success === false) {
          setWishlist(wishlist);
          persistWishlist(wishlist);
          return {
            success: false,
            message: data?.error || "Failed to update wishlist",
          };
        }

        return {
          success: true,
          message: currentlyWishlisted ? "Removed from wishlist" : "Added to wishlist",
        };
      } catch (error) {
        console.error("Failed to update wishlist:", error);
        setWishlist(wishlist);
        persistWishlist(wishlist);
        return {
          success: false,
          message: "Failed to update wishlist",
        };
      }
    },
    [token, wishlist]
  );

  const value = useMemo(
    () => ({
      wishlist,
      isWishlisted: (productId: number) => wishlist.includes(productId),
      toggleWishlist,
      refreshWishlist,
    }),
    [refreshWishlist, toggleWishlist, wishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }

  return context;
}
