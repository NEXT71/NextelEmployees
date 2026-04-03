const superadmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Super Admin access required',
      userRole: req.user.role
    });
  }
  next();
};

export default superadmin;
