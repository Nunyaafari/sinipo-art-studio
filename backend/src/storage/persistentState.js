import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDefaultArtworks,
  createDefaultBlogPosts,
  createDefaultDiscountCodes,
  createDefaultMediaAssets
} from './adminSeedData.js';
import { createDefaultStorefrontSettings } from '../config/storefrontSettings.js';
import { isDatabaseConfigured } from '../config/database.js';

const storageDir = path.dirname(fileURLToPath(import.meta.url));
const storageFile = path.join(storageDir, 'persistent-data.json');
const defaultPasswordHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
const legacySeedUsers = [
  {
    email: 'admin@sinipo.art',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  {
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user'
  }
];

const userScopedBuckets = [
  'userWishlists',
  'userAddresses',
  'userOrderHistory',
  'userReviews',
  'loyaltyPoints'
];

const createDefaultState = () => ({
  users: [],
  orders: {},
  artworks: createDefaultArtworks(),
  blogPosts: createDefaultBlogPosts(),
  discountCodes: createDefaultDiscountCodes(),
  mediaAssets: createDefaultMediaAssets(),
  storefrontSettings: createDefaultStorefrontSettings(),
  inventoryMovements: [],
  adminAuditLogs: [],
  userWishlists: {},
  userAddresses: {},
  userOrderHistory: {},
  userReviews: {},
  loyaltyPoints: {}
});

const isLegacySeedUser = (user) =>
  legacySeedUsers.some(
    (legacyUser) =>
      user?.email === legacyUser.email &&
      user?.firstName === legacyUser.firstName &&
      user?.lastName === legacyUser.lastName &&
      user?.role === legacyUser.role &&
      user?.password === defaultPasswordHash
  );

const sanitizeLoadedState = (parsedState) => {
  if (!parsedState || typeof parsedState !== 'object') {
    return parsedState;
  }

  const existingUsers = Array.isArray(parsedState.users) ? parsedState.users : [];
  const removedUserIds = existingUsers
    .filter((user) => isLegacySeedUser(user))
    .map((user) => String(user.id));

  if (removedUserIds.length === 0) {
    return parsedState;
  }

  const sanitizedState = {
    ...parsedState,
    users: existingUsers.filter((user) => !isLegacySeedUser(user))
  };

  userScopedBuckets.forEach((bucketName) => {
    const currentBucket = parsedState[bucketName];
    if (!currentBucket || typeof currentBucket !== 'object' || Array.isArray(currentBucket)) {
      return;
    }

    const nextBucket = { ...currentBucket };
    removedUserIds.forEach((userId) => {
      delete nextBucket[userId];
    });
    sanitizedState[bucketName] = nextBucket;
  });

  return sanitizedState;
};

const ensureStorageFile = () => {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  if (!fs.existsSync(storageFile)) {
    fs.writeFileSync(storageFile, JSON.stringify(createDefaultState(), null, 2), 'utf8');
  }
};

const shouldPersistRuntimeToFile = () =>
  process.env.PERSIST_RUNTIME_TO_FILE === 'true' || !isDatabaseConfigured;

const loadState = () => {
  if (!shouldPersistRuntimeToFile()) {
    return createDefaultState();
  }

  ensureStorageFile();

  try {
    const raw = fs.readFileSync(storageFile, 'utf8');
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeLoadedState(parsed);
    const mergedState = {
      ...createDefaultState(),
      ...sanitized
    };

    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      fs.writeFileSync(storageFile, JSON.stringify(mergedState, null, 2), 'utf8');
    }

    return mergedState;
  } catch (error) {
    console.error('Failed to load persistent state, recreating store:', error);
    const fallback = createDefaultState();
    fs.writeFileSync(storageFile, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
};

const state = loadState();
const saveHooks = new Set();

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const replaceValueInPlace = (currentValue, nextValue) => {
  if (Array.isArray(currentValue)) {
    const nextArray = Array.isArray(nextValue) ? cloneJson(nextValue) : [];
    currentValue.splice(0, currentValue.length, ...nextArray);
    return currentValue;
  }

  if (currentValue && typeof currentValue === 'object') {
    const nextObject = nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)
      ? cloneJson(nextValue)
      : {};

    Object.keys(currentValue).forEach((key) => {
      delete currentValue[key];
    });

    Object.assign(currentValue, nextObject);
    return currentValue;
  }

  return nextValue;
};

const applyStateSnapshot = (snapshot) => {
  const mergedState = {
    ...createDefaultState(),
    ...(snapshot && typeof snapshot === 'object' ? snapshot : {})
  };

  Object.entries(mergedState).forEach(([key, value]) => {
    if (!(key in state)) {
      state[key] = Array.isArray(value) ? [] : value && typeof value === 'object' ? {} : value;
    }

    state[key] = replaceValueInPlace(state[key], value);
  });
};

export const getPersistentStateSnapshot = () => cloneJson(state);

export const registerPersistentStateSaveHook = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }

  saveHooks.add(callback);

  return () => {
    saveHooks.delete(callback);
  };
};

export const savePersistentState = ({ notifyHooks = true } = {}) => {
  if (shouldPersistRuntimeToFile()) {
    ensureStorageFile();
    fs.writeFileSync(storageFile, JSON.stringify(state, null, 2), 'utf8');
  }

  if (!notifyHooks) {
    return;
  }

  const snapshot = getPersistentStateSnapshot();
  saveHooks.forEach((hook) => {
    Promise.resolve()
      .then(() => hook(snapshot))
      .catch((error) => {
        console.error('Persistent state save hook failed:', error);
      });
  });
};

export const persistentState = state;

export const hydratePersistentState = (snapshot, options = {}) => {
  applyStateSnapshot(snapshot);

  if (options.persistToFile !== false && shouldPersistRuntimeToFile()) {
    savePersistentState({
      notifyHooks: options.notifyHooks !== true ? false : true
    });
  }

  return state;
};

export const getUsersState = () => state.users;
export const getOrdersState = () => state.orders;
export const getArtworksState = () => state.artworks;
export const getBlogPostsState = () => state.blogPosts;
export const getDiscountCodesState = () => state.discountCodes;
export const getMediaAssetsState = () => state.mediaAssets;
export const getStorefrontSettingsState = () => state.storefrontSettings;
export const getInventoryMovementsState = () => state.inventoryMovements;
export const getAdminAuditLogsState = () => state.adminAuditLogs;

export const getBucket = (bucketName) => {
  if (!state[bucketName]) {
    state[bucketName] = {};
  }

  return state[bucketName];
};

export const getUserBucketValue = (bucketName, userId, fallback) => {
  const bucket = getBucket(bucketName);
  const key = String(userId);

  if (!(key in bucket)) {
    bucket[key] = fallback;
  }

  return bucket[key];
};

export const setUserBucketValue = (bucketName, userId, value) => {
  const bucket = getBucket(bucketName);
  bucket[String(userId)] = value;
  savePersistentState();
  return value;
};

export const removeUserBucketValue = (bucketName, userId) => {
  const bucket = getBucket(bucketName);
  delete bucket[String(userId)];
  savePersistentState();
};

export const getStorageFilePath = () => storageFile;
export const isRuntimeFilePersistenceEnabled = () => shouldPersistRuntimeToFile();
