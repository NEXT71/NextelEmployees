const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  if (req.user.role !== 'admin') {
    console.warn(`Unauthorized admin access attempt by user: ${req.user.userId}, role: ${req.user.role}`);
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      userRole: req.user.role
    });
  }
  next();
};

export default admin;