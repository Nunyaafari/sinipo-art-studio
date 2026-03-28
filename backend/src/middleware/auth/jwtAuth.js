import { getUserById, verifyToken } from '../../controllers/authController.js';

// Authenticate JWT Token
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    const user = getUserById(decoded?.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Please login again'
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    console.error('JWT authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Please login again'
      });
    }

    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
};

// Optional Authentication (doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const user = getUserById(decoded?.userId);

      if (user) {
        req.user = decoded;
      }
    }
    
    next();

  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

// Require Admin Role
export const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    // Check if user is admin (you might want to fetch user from database)
    // For now, we'll assume admin check is done elsewhere
    next();

  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(500).json({
      error: 'Authorization failed',
      message: 'Internal server error'
    });
  }
};

// Rate Limiting by User
export const userRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    try {
      const userId = req.user?.userId || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (requests.has(userId)) {
        const userRequests = requests.get(userId).filter(time => time > windowStart);
        requests.set(userId, userRequests);
      }

      // Check current requests
      const currentRequests = requests.get(userId) || [];
      
      if (currentRequests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 60000)} minutes.`
        });
      }

      // Add current request
      currentRequests.push(now);
      requests.set(userId, currentRequests);

      next();

    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};

// Validate Request Body
export const validateRequestBody = (requiredFields) => {
  return (req, res, next) => {
    try {
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!req.body[field]) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: `The following fields are required: ${missingFields.join(', ')}`
        });
      }

      next();

    } catch (error) {
      console.error('Request validation error:', error);
      return res.status(500).json({
        error: 'Validation failed',
        message: 'Internal server error'
      });
    }
  };
};

// Sanitize Input
export const sanitizeInput = (req, res, next) => {
  try {
    // Basic XSS protection - sanitize string inputs
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return obj
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const key in obj) {
          sanitized[key] = sanitize(obj[key]);
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitize(req.query);
    }

    next();

  } catch (error) {
    console.error('Input sanitization error:', error);
    next(); // Continue on error
  }
};

// CORS Headers for Authentication
export const authCorsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

// Log Authentication Events
export const logAuthEvent = (eventType) => {
  return (req, res, next) => {
    try {
      const userId = req.user?.userId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      console.log(`[AUTH EVENT] ${eventType}`, {
        userId,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      });

      next();

    } catch (error) {
      console.error('Auth logging error:', error);
      next();
    }
  };
};
