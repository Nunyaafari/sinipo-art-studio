import { getPersistentStateSnapshot, hydratePersistentState } from '../../src/storage/persistentState.js';

const sourceSnapshot = getPersistentStateSnapshot();
const baselineSnapshot = {
  ...sourceSnapshot,
  users: [],
  orders: {},
  inventoryMovements: [],
  adminAuditLogs: [],
  userWishlists: {},
  userAddresses: {},
  userOrderHistory: {},
  userReviews: {},
  loyaltyPoints: {}
};

export const resetPersistentState = () =>
  hydratePersistentState(baselineSnapshot, {
    persistToFile: true,
    notifyHooks: false
  });

export const loadCleanState = () =>
  hydratePersistentState(baselineSnapshot, {
    persistToFile: false,
    notifyHooks: false
  });
