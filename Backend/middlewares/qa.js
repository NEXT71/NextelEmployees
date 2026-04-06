const qa = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  // superadmin and admin also pass qa-level checks
  if (!['qa', 'admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'QA access required',
      userRole: req.user.role
    });
  }
  next();
};

export default qa;
