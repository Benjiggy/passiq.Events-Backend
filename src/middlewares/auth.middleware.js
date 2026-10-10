const { verifyAccessToken } = require('../utils/tokenGenerator');
const ApiResponse = require('../utils/apiResponse');
const dataStore = require('../models/dataStore');

/**
 * JWT Authentication Middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return ApiResponse.error(res, 'Authentication token missing. Please sign in.', 401);
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return ApiResponse.error(res, 'Invalid or expired token', 401, { detail: 'Invalid or expired token' });
    }

    const user = await dataStore.findUserById(decoded.id);
    if (!user) {
      return ApiResponse.error(res, 'User account no longer exists.', 401);
    }

    req.user = {
      id: user.id || user._id,
      _id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role || user.accountType || 'attendee',
      accountType: user.accountType || user.role || 'attendee',
      phone: user.phone,
      payoutAccount: user.payoutAccount
    };

    next();
  } catch (error) {
    return ApiResponse.error(res, 'Authentication error: ' + error.message, 401);
  }
};

/**
 * Optional Authentication Middleware (identifies user if token is present, continues if not)
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await dataStore.findUserById(decoded.id);
        if (user) {
          req.user = {
            id: user.id || user._id,
            _id: user.id || user._id,
            name: user.name,
            email: user.email,
            role: user.role || user.accountType || 'attendee',
            accountType: user.accountType || user.role || 'attendee'
          };
        }
      }
    }
  } catch (e) {
    // Non-blocking
  }
  next();
};

/**
 * Role-Based Access Control (RBAC)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required.', 401);
    }

    const userRole = req.user.role || req.user.accountType || 'attendee';
    if (!allowedRoles.includes(userRole)) {
      return ApiResponse.error(res, `Access denied. Requires one of [${allowedRoles.join(', ')}] role.`, 403);
    }

    next();
  };
};

/**
 * Host or Admin Capability Check
 */
const requireHostOrAdmin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Authentication required.', 401);
  }

  const role = req.user.role || req.user.accountType || 'attendee';
  if (role !== 'host' && role !== 'admin') {
    return ApiResponse.error(res, 'Host or administrator capability required.', 403);
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Authentication required.', 401);
  }

  const role = req.user.role || req.user.accountType;
  if (role !== 'admin') {
    return ApiResponse.error(res, 'Administrator privileges required.', 403);
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireHostOrAdmin,
  requireAdmin
};
