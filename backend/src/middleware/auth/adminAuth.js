import { getUserById, verifyToken } from '../../controllers/authController.js';

export const ADMIN_PANEL_ROLES = ['admin', 'manager', 'admin_viewer'];
export const ADMIN_EDITOR_ROLES = ['admin', 'manager'];

const adminPanelRoleSet = new Set(ADMIN_PANEL_ROLES);

const getSafeUserId = (user) => {
  const parsed = Number.parseInt(user?.id, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSafeAdminUser = (user, authMethod) => ({
  id: getSafeUserId(user),
  email: user?.email || null,
  firstName: user?.firstName || '',
  lastName: user?.lastName || '',
  role: user?.role || 'user',
  authMethod
});

export const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin access requires a valid signed-in account.'
    });
  }

  try {
    const token = authHeader.substring(7).trim();
    const decoded = verifyToken(token);
    const user = getUserById(decoded?.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Your session is no longer valid. Please sign in again.'
      });
    }

    if (!adminPanelRoleSet.has(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This account does not have admin panel access.'
      });
    }

    req.user = decoded;
    req.adminUser = getSafeAdminUser(user, 'jwt');
    return next();
  } catch (error) {
    console.error('Admin JWT authentication error:', error);
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Admin access requires a valid signed-in account.'
  });
};

export const requireRoles = (...allowedRoles) => (req, res, next) => {
  const currentRole = req.adminUser?.role;

  if (currentRole && allowedRoles.includes(currentRole)) {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden',
    message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
  });
};

// Rate limiting for admin endpoints
export const adminRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many admin requests, please try again later.'
};
