import { getStorefrontSettingsState } from '../storage/persistentState.js';
import { sanitizeStorefrontSettings } from './storefrontSettings.js';

export const getStorefrontSettings = () => sanitizeStorefrontSettings(getStorefrontSettingsState());
export const getShippingSettings = () => getStorefrontSettings().shipping;
export const getTaxSettings = () => getStorefrontSettings().tax;
export const getPaymentSettings = () => getStorefrontSettings().payment;
export const getEmailSettings = () => getStorefrontSettings().email;
export const getInventorySettings = () => getStorefrontSettings().inventory;
export const getHomepageSettings = () => getStorefrontSettings().homepage;
export const getSeoSettings = () => getStorefrontSettings().seo;

export const calculateShippingCost = (subtotal) => {
  const shippingConfig = getShippingSettings();

  if (subtotal >= shippingConfig.freeShippingThreshold) {
    return 0;
  }

  return shippingConfig.standardShippingCost;
};

export const calculateTaxAmount = (taxableSubtotal) => {
  const taxConfig = getTaxSettings();

  if (!taxConfig.enabled || taxConfig.taxRate <= 0) {
    return 0;
  }

  return Math.round(taxableSubtotal * (taxConfig.taxRate / 100) * 100) / 100;
};

export const getStorefrontPublicConfig = () => {
  const settings = getStorefrontSettings();

  return {
    shipping: settings.shipping,
    tax: settings.tax,
    payment: settings.payment,
    email: {
      providerName: settings.email.providerName,
      fromName: settings.email.fromName,
      fromAddress: settings.email.fromAddress,
      replyToAddress: settings.email.replyToAddress
    },
    inventory: settings.inventory,
    homepage: settings.homepage,
    seo: {
      siteName: settings.seo.siteName,
      defaultTitle: settings.seo.defaultTitle,
      defaultDescription: settings.seo.defaultDescription,
      defaultImage: settings.seo.defaultImage,
      locale: settings.seo.locale
    }
  };
};
