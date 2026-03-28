const trimUrl = (value) => (typeof value === 'string' ? value.trim().replace(/\/$/, '') : '');

const parseFirebaseConfig = () => {
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG || '{}');
  } catch {
    return {};
  }
};

export const getFrontendAppUrl = () => {
  const configuredUrl = trimUrl(process.env.FRONTEND_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  const firebaseConfig = parseFirebaseConfig();
  const authDomain = trimUrl(firebaseConfig?.authDomain);
  if (authDomain) {
    return authDomain.startsWith('http') ? authDomain : `https://${authDomain}`;
  }

  const projectId =
    trimUrl(firebaseConfig?.projectId) ||
    trimUrl(process.env.GOOGLE_CLOUD_PROJECT) ||
    trimUrl(process.env.GCLOUD_PROJECT);

  if (projectId) {
    return `https://${projectId}.web.app`;
  }

  return 'http://localhost:5173';
};
