import { getPersistentStateSnapshot, hydratePersistentState } from '../../src/storage/persistentState.js';

const baselineSnapshot = getPersistentStateSnapshot();

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
