const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let analyticsInitialized = false;

export const isAnalyticsEnabled = () => Boolean(measurementId);

export const initializeAnalytics = () => {
  if (!measurementId || analyticsInitialized || typeof document === "undefined") {
    return;
  }

  const analyticsScript = document.createElement("script");
  analyticsScript.async = true;
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(analyticsScript);

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false
  });

  analyticsInitialized = true;
};

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (!measurementId || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: pageTitle || pagePath
  });
};
