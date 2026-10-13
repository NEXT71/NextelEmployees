import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// auth.js
const auth = async (req, res, next) => {
  try {
    // Check for token in Authorization header first
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no Authorization header, check cookies
    if (!token && req.cookies) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure we have a valid userId or employeeId
    if (!decoded.userId && !decoded._id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
        error: 'MISSING_USER_ID'
      });
    }

    // Always confirm the account still exists and is enabled, so deleting or
    // deactivating a user takes effect immediately instead of when the token expires.
    const account = await User.findById(decoded.userId || decoded._id)
      .select('role username isActive activeSessionId activeSessionExpiresAt')
      .lean();

    // superadmin is exempt from the isActive check so the system can never be locked out
    if (!account || (account.role !== 'superadmin' && account.isActive === false)) {
      return res.status(401).json({
        success: false,
        message: 'This account is disabled or no longer exists.',
        error: 'ACCOUNT_DISABLED'
      });
    }

    if (decoded.sessionId) {
      const sessionValid =
        account.activeSessionId === decoded.sessionId &&
        account.activeSessionExpiresAt &&
        account.activeSessionExpiresAt > new Date();

      if (!sessionValid) {
        return res.status(401).json({
          success: false,
          message: 'This login session is no longer active. Please log in again.',
          error: 'SESSION_EXPIRED'
        });
      }
    }

    req.user = {
      _id: decoded._id || decoded.userId,
      userId: decoded.userId || decoded._id,
      employeeId: decoded.employeeId,
      role: account.role, // current role from DB, not the possibly stale token
      email: decoded.email,
      username: account.username,
      sessionId: decoded.sessionId
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token',
      error: err.message
    });
  }
};

export default auth;