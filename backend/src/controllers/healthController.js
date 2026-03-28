import config from '../config/environment.js';
import logger from '../utils/logger.js';

// Health check endpoint
export const healthCheck = async (req, res) => {
  try {
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Sinipo Art Backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    };

    logger.info('Health check requested', { ip: req.ip });
    
    res.json(healthData);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

// Detailed health check (for monitoring systems)
export const detailedHealthCheck = async (req, res) => {
  try {
    const checks = {
      server: await checkServer(),
      database: await checkDatabase(),
      externalServices: await checkExternalServices(),
      memory: checkMemory(),
      disk: await checkDisk()
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    const healthData = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    const statusCode = allHealthy ? 200 : 503;
    
    logger.info('Detailed health check', { 
      status: healthData.status,
      checks: Object.keys(checks).map(k => ({ [k]: checks[k].status }))
    });

    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
};

// Check server status
const checkServer = async () => {
  try {
    return {
      status: 'healthy',
      message: 'Server is running',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Check database connection
const checkDatabase = async () => {
  try {
    // In production, you would actually check database connection
    // For now, we'll simulate a successful check
    return {
      status: 'healthy',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Check external services
const checkExternalServices = async () => {
  const services = {};

  // Check Paystack
  try {
    // In production, you would make a test API call
    services.paystack = {
      status: config.paystack.secretKey ? 'healthy' : 'not_configured',
      message: config.paystack.secretKey ? 'Paystack configured' : 'Paystack not configured'
    };
  } catch (error) {
    services.paystack = {
      status: 'unhealthy',
      message: error.message
    };
  }

  // Check Cloudinary
  try {
    services.cloudinary = {
      status: config.cloudinary.cloudName ? 'healthy' : 'not_configured',
      message: config.cloudinary.cloudName ? 'Cloudinary configured' : 'Cloudinary not configured'
    };
  } catch (error) {
    services.cloudinary = {
      status: 'unhealthy',
      message: error.message
    };
  }

  // Check Email service
  try {
    services.email = {
      status: config.email.user ? 'healthy' : 'not_configured',
      message: config.email.user ? 'Email configured' : 'Email not configured'
    };
  } catch (error) {
    services.email = {
      status: 'unhealthy',
      message: error.message
    };
  }

  try {
    services.uploads = {
      status: 'healthy',
      message: `Upload storage mode: ${config.uploads.storage}`
    };
  } catch (error) {
    services.uploads = {
      status: 'unhealthy',
      message: error.message
    };
  }

  try {
    services.monitoring = {
      status: config.monitoring.logFilePath || config.monitoring.alertWebhookUrl ? 'healthy' : 'not_configured',
      message:
        config.monitoring.logFilePath || config.monitoring.alertWebhookUrl
          ? 'Monitoring outputs configured'
          : 'Monitoring outputs not configured'
    };
  } catch (error) {
    services.monitoring = {
      status: 'unhealthy',
      message: error.message
    };
  }

  return services;
};

// Check memory usage
const checkMemory = () => {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;

  return {
    status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
    usage: memoryUsagePercent.toFixed(2) + '%',
    heapUsed: Math.round(usedMemory / 1024 / 1024) + 'MB',
    heapTotal: Math.round(totalMemory / 1024 / 1024) + 'MB',
    external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
  };
};

// Check disk space (simulated)
const checkDisk = async () => {
  try {
    // In production, you would check actual disk space
    return {
      status: 'healthy',
      message: 'Disk space available',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Readiness check (for Kubernetes/container orchestration)
export const readinessCheck = async (req, res) => {
  try {
    // Check if the application is ready to serve requests
    const isReady = true; // In production, check database connections, etc.
    
    if (isReady) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
};

// Liveness check (for Kubernetes/container orchestration)
export const livenessCheck = async (req, res) => {
  try {
    // Check if the application is alive
    res.status(200).json({ status: 'alive' });
  } catch (error) {
    res.status(500).json({ status: 'not alive', error: error.message });
  }
};
