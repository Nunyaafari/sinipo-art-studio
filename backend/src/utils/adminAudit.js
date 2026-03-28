import crypto from 'crypto';
import { getAdminAuditLogsState, savePersistentState } from '../storage/persistentState.js';
import logger from './logger.js';

const adminAuditLogs = getAdminAuditLogsState();
const MAX_AUDIT_LOGS = 5000;

const sanitizeAuditPayload = (value, depth = 0) => {
  if (depth > 3) {
    return '[Truncated]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeAuditPayload(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .map(([key, item]) => [key, sanitizeAuditPayload(item, depth + 1)])
    );
  }

  return String(value);
};

const resolveAdminActor = (req) => {
  const adminUser = req?.adminUser || null;
  const authHeader = typeof req?.headers?.authorization === 'string' ? req.headers.authorization : '';
  const usedBearerAuth = authHeader.startsWith('Bearer ');

  return {
    type: 'admin',
    id: adminUser?.id ?? null,
    email: adminUser?.email ?? null,
    role: adminUser?.role ?? null,
    authMethod: adminUser?.authMethod || (usedBearerAuth ? 'jwt' : 'unknown'),
    ip: req?.ip || null,
    userAgent:
      typeof req?.get === 'function'
        ? req.get('User-Agent') || null
        : typeof req?.headers?.['user-agent'] === 'string'
          ? req.headers['user-agent']
          : null
  };
};

export const recordAdminAudit = (req, input) => {
  const entry = {
    id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    createdAt: new Date().toISOString(),
    action: input?.action || 'unknown',
    targetType: input?.targetType || 'unknown',
    targetId: input?.targetId ?? null,
    summary: input?.summary || '',
    actor: resolveAdminActor(req),
    request: {
      method: req?.method || null,
      path: req?.originalUrl || req?.url || null
    },
    changes: sanitizeAuditPayload(input?.changes ?? null),
    metadata: sanitizeAuditPayload(input?.metadata ?? null)
  };

  adminAuditLogs.unshift(entry);

  if (adminAuditLogs.length > MAX_AUDIT_LOGS) {
    adminAuditLogs.splice(MAX_AUDIT_LOGS);
  }

  savePersistentState();
  logger.info('Admin audit event recorded', {
    auditId: entry.id,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    ip: entry.actor.ip
  });

  return entry;
};

export const getAdminAuditEntries = (filters = {}) => {
  const {
    action,
    targetType,
    search,
    limit = 100
  } = filters;

  const normalizedSearch = typeof search === 'string' ? search.trim().toLowerCase() : '';
  const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 100, 500));

  return adminAuditLogs
    .filter((entry) => {
      if (action && entry.action !== action) {
        return false;
      }

      if (targetType && entry.targetType !== targetType) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        entry.summary,
        entry.action,
        entry.targetType,
        String(entry.targetId ?? ''),
        JSON.stringify(entry.metadata ?? {}),
        JSON.stringify(entry.changes ?? {})
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    })
    .slice(0, safeLimit);
};

export const getAdminAuditStats = () => {
  const actionCounts = {};
  const targetCounts = {};

  adminAuditLogs.forEach((entry) => {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    targetCounts[entry.targetType] = (targetCounts[entry.targetType] || 0) + 1;
  });

  return {
    total: adminAuditLogs.length,
    actionCounts,
    targetCounts,
    latestEventAt: adminAuditLogs[0]?.createdAt || null
  };
};
