const hr = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'HR access required',
      userRole: req.user.role
    });
  }

  next();
};

export default hr;