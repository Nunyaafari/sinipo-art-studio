import Paystack from 'paystack';
import dotenv from 'dotenv';
import { getPaymentSettings } from './storefront.js';

dotenv.config();

const isConfiguredValue = (value) =>
  Boolean(value && !/your_(secret|public)_key_here/i.test(value));

export const getPaystackConfig = () => {
  const settings = getPaymentSettings();
  const isTestMode = settings.paymentMode === 'test';
  const configuredPublicKey = isTestMode
    ? settings.testPublicKey || process.env.PAYSTACK_TEST_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || ''
    : settings.livePublicKey || process.env.PAYSTACK_PUBLIC_KEY || '';
  const configuredSecretKey = isTestMode
    ? settings.testSecretKey || process.env.PAYSTACK_TEST_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || ''
    : settings.liveSecretKey || process.env.PAYSTACK_SECRET_KEY || '';

  return {
    mode: settings.paymentMode,
    publicKey: isConfiguredValue(configuredPublicKey) ? configuredPublicKey : '',
    secretKey: isConfiguredValue(configuredSecretKey) ? configuredSecretKey : '',
    webhookSecret: settings.webhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET || ''
  };
};

export const hasPaystackConfig = () => Boolean(getPaystackConfig().secretKey);

export const getPaystackClient = () => {
  const { secretKey } = getPaystackConfig();
  return secretKey ? Paystack(secretKey) : null;
};

export default getPaystackClient;
