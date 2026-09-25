const roles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const effectiveRoles = allowedRoles.includes('admin')
      ? [...new Set([...allowedRoles, 'superadmin', 'hr'])]
      : allowedRoles;

    if (!effectiveRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }

    next();
  };
};

export default roles