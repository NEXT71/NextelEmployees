import jwt from 'jsonwebtoken';

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

    req.user = {
      _id: decoded._id || decoded.userId,
      userId: decoded.userId || decoded._id,
      employeeId: decoded.employeeId,
      role: decoded.role,
      email: decoded.email,
      username: decoded.username
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