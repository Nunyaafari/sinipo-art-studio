import config from '../config/environment.js';
import fs from 'fs';
import path from 'path';

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Get current log level
const getCurrentLogLevel = () => {
  const level = process.env.LOG_LEVEL || (config.isDevelopment ? 'debug' : 'info');
  return LOG_LEVELS[level] || LOG_LEVELS.info;
};

// Format log message
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta,
    environment: config.nodeEnv,
    service: 'sinipo-art-backend'
  };

  return JSON.stringify(logEntry);
};

// Console transport
const consoleTransport = (level, message, meta) => {
  const colors = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[90m'  // Gray
  };

  const reset = '\x1b[0m';
  const color = colors[level] || colors.info;

  if (config.isDevelopment) {
    console.log(
      `${color}[${level.toUpperCase()}]${reset} ${new Date().toISOString()} - ${message}`,
      meta && Object.keys(meta).length > 0 ? meta : ''
    );
  } else {
    console.log(formatMessage(level, message, meta));
  }
};

// File transport (for production)
const fileTransport = (level, message, meta) => {
  const logFilePath = config.monitoring.logFilePath;

  if (!logFilePath) {
    if (config.isProduction) {
      console.log(formatMessage(level, message, meta));
    }
    return;
  }

  try {
    const absolutePath = path.isAbsolute(logFilePath)
      ? logFilePath
      : path.join(process.cwd(), logFilePath);
    const directory = path.dirname(absolutePath);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.appendFileSync(absolutePath, `${formatMessage(level, message, meta)}\n`, 'utf8');
  } catch (error) {
    console.error('File logger transport failed:', error);
  }
};

// Sentry transport (for error tracking)
const sentryTransport = (level, message, meta) => {
  if (level === 'error' && config.analytics.sentryDsn) {
    // In production, you would send to Sentry
    console.error('Sentry Error:', message, meta);
  }
};

const alertWebhookTransport = (level, message, meta) => {
  if (level !== 'error' || !config.monitoring.alertWebhookUrl || typeof fetch !== 'function') {
    return;
  }

  void fetch(config.monitoring.alertWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service: 'sinipo-art-backend',
      level,
      message,
      meta,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
    })
  }).catch((error) => {
    console.error('Alert webhook transport failed:', error);
  });
};

// Main logger function
const log = (level, message, meta = {}) => {
  const currentLevel = getCurrentLogLevel();
  const messageLevel = LOG_LEVELS[level];

  if (messageLevel <= currentLevel) {
    consoleTransport(level, message, meta);
    fileTransport(level, message, meta);
    sentryTransport(level, message, meta);
    alertWebhookTransport(level, message, meta);
  }
};

// Logger object with methods for each level
const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),

  // Specialized logging methods
  request: (req, res, responseTime) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    if (res.statusCode >= 400) {
      log('warn', `HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, meta);
    } else {
      log('info', `HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, meta);
    }
  },

  auth: (action, userId, meta = {}) => {
    log('info', `Auth: ${action}`, { userId, ...meta });
  },

  payment: (action, data) => {
    log('info', `Payment: ${action}`, data);
  },

  security: (action, meta = {}) => {
    log('warn', `Security: ${action}`, meta);
  },

  performance: (metric, value, meta = {}) => {
    log('info', `Performance: ${metric}`, { value, ...meta });
  }
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - start;
    logger.request(req, res, responseTime);
    originalEnd.apply(res, args);
  };

  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.userId
  });

  next(err);
};

export const registerProcessMonitoring = () => {
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason)
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack
    });
  });
};

export default logger;
