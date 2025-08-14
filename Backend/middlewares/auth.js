import jwt from 'jsonwebtoken';

// auth.js
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure we have a valid employeeId
    if (!decoded.employeeId && !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
        error: 'MISSING_EMPLOYEE_ID'
      });
    }

    req.user = {
      userId: decoded.userId,
      employeeId: decoded.employeeId || decoded.userId, // Fallback to userId
      role: decoded.role
    };
    
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token'
    });
  }
};

export default auth;