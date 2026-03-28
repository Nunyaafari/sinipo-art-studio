import { isDatabaseConfigured, pool, testConnection } from '../config/database.js';
import {
  getPersistentStateSnapshot,
  hydratePersistentState,
  registerPersistentStateSaveHook
} from './persistentState.js';
import {
  getFashionCatalogProductsSnapshot,
  hydrateFashionCatalogProducts
} from '../data/products.js';

const RUNTIME_STATE_KEY = 'app_runtime_v1';
let runtimeDatabaseReady = false;
let pendingFlushTimer = null;
let inFlightFlush = null;
let hookRegistered = false;
let pendingReason = 'runtime-update';

const buildRuntimeSnapshot = (reason) => ({
  version: 1,
  reason,
  savedAt: new Date().toISOString(),
  persistentState: getPersistentStateSnapshot(),
  fashionCatalogProducts: getFashionCatalogProductsSnapshot()
});

const ensureRuntimeStateTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS runtime_state (
      state_key TEXT PRIMARY KEY,
      state_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const writeRuntimeSnapshot = async (reason = 'runtime-update') => {
  if (!runtimeDatabaseReady) {
    return false;
  }

  const snapshot = buildRuntimeSnapshot(reason);

  await pool.query(
    `
      INSERT INTO runtime_state (state_key, state_value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET
        state_value = EXCLUDED.state_value,
        updated_at = NOW()
    `,
    [RUNTIME_STATE_KEY, JSON.stringify(snapshot)]
  );

  return true;
};

export const queueRuntimeDatabaseStateSave = (reason = 'runtime-update') => {
  if (!runtimeDatabaseReady) {
    return;
  }

  pendingReason = reason;

  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
  }

  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = null;
    inFlightFlush = writeRuntimeSnapshot(pendingReason)
      .catch((error) => {
        console.error('Runtime database snapshot save failed:', error.message);
      })
      .finally(() => {
        inFlightFlush = null;
      });
  }, 150);
};

export const flushRuntimeDatabaseStateSave = async (reason = 'runtime-flush') => {
  if (!runtimeDatabaseReady) {
    return false;
  }

  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }

  if (inFlightFlush) {
    await inFlightFlush;
  }

  return writeRuntimeSnapshot(reason);
};

export const initializeRuntimeDatabaseState = async () => {
  try {
    if (!isDatabaseConfigured) {
      console.log('ℹ️ Runtime database sync is disabled because no PostgreSQL environment is configured.');
      return false;
    }

    const databaseConnected = await testConnection();
    if (!databaseConnected) {
      console.warn('⚠️ Runtime database sync disabled because PostgreSQL is unavailable.');
      return false;
    }

    await ensureRuntimeStateTable();
    runtimeDatabaseReady = true;

    const result = await pool.query(
      'SELECT state_value FROM runtime_state WHERE state_key = $1 LIMIT 1',
      [RUNTIME_STATE_KEY]
    );

    if (result.rows.length > 0 && result.rows[0]?.state_value) {
      const snapshot = result.rows[0].state_value;

      if (snapshot?.persistentState) {
        hydratePersistentState(snapshot.persistentState, {
          persistToFile: false,
          notifyHooks: false
        });
      }

      if (Array.isArray(snapshot?.fashionCatalogProducts)) {
        hydrateFashionCatalogProducts(snapshot.fashionCatalogProducts);
      }

      console.log('🗄️ Runtime state hydrated from PostgreSQL snapshot');
    } else {
      await writeRuntimeSnapshot('initial-seed');
      console.log('🗄️ Runtime state seeded into PostgreSQL');
    }

    if (!hookRegistered) {
      registerPersistentStateSaveHook(() => {
        queueRuntimeDatabaseStateSave('persistent-state-save');
      });
      hookRegistered = true;
    }

    return true;
  } catch (error) {
    runtimeDatabaseReady = false;
    console.warn(`⚠️ Runtime database sync unavailable: ${error.message}`);
    return false;
  }
};

export const isRuntimeDatabaseReady = () => runtimeDatabaseReady;
