const qa = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  // HR, superadmin, and admin can review sales from the admin dashboard.
  if (!['qa', 'admin', 'superadmin', 'hr'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'QA access required',
      userRole: req.user.role
    });
  }
  next();
};

export default qa;
