import { initializeApp, getApps, getApp } from "firebase/app";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
} from "firebase/auth";

type SocialProviderName = "google" | "facebook";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBVW6_VxOrMt0gVbDExj8I1SWubk1Crntw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sinipo-art-studio-627c1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sinipo-art-studio-627c1",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sinipo-art-studio-627c1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "34924541860",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:34924541860:web:aea8dcee183ab44d533331",
};

const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

const createProvider = (provider: SocialProviderName) => {
  if (provider === "google") {
    const googleProvider = new GoogleAuthProvider();
    googleProvider.addScope("email");
    googleProvider.addScope("profile");
    googleProvider.setCustomParameters({ prompt: "select_account" });
    return googleProvider;
  }

  const facebookProvider = new FacebookAuthProvider();
  facebookProvider.addScope("email");
  facebookProvider.addScope("public_profile");
  return facebookProvider;
};

const formatProviderError = (provider: SocialProviderName, error: unknown) => {
  const fallback =
    provider === "google"
      ? "Google sign-in failed. Please try again."
      : "Facebook sign-in failed. Please try again.";

  if (!(error instanceof Error)) {
    return fallback;
  }

  switch (error.message) {
    case "Firebase: Error (auth/popup-closed-by-user).":
      return "The sign-in popup was closed before the login finished.";
    case "Firebase: Error (auth/popup-blocked).":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "Firebase: Error (auth/unauthorized-domain).":
      return "This domain is not authorized for social sign-in yet.";
    case "Firebase: Error (auth/operation-not-allowed).":
      return `${provider === "google" ? "Google" : "Facebook"} sign-in is not enabled in Firebase yet.`;
    case "Firebase: Error (auth/account-exists-with-different-credential).":
      return "This email is already linked to a different sign-in method.";
    case "Firebase: Error (auth/cancelled-popup-request).":
      return "Another sign-in window is already open. Finish that one or try again.";
    default:
      return fallback;
  }
};

export const signInWithSocialProvider = async (provider: SocialProviderName) => {
  const authProvider = createProvider(provider);

  try {
    const credential = await signInWithPopup(firebaseAuth, authProvider);
    const idToken = await credential.user.getIdToken(true);
    const profile = {
      email: credential.user.email || "",
      firstName: credential.user.displayName?.split(" ").filter(Boolean)[0] || "",
      lastName: credential.user.displayName?.split(" ").slice(1).join(" ") || "",
    };

    await signOut(firebaseAuth);

    return {
      idToken,
      profile,
    };
  } catch (error) {
    await signOut(firebaseAuth).catch(() => undefined);
    throw new Error(formatProviderError(provider, error));
  }
};
