const ROLE_HIERARCHY = {
  owner: ["owner", "admin", "manager", "worker", "client"],
  admin: ["admin", "manager", "worker", "client"],
  manager: ["manager", "worker", "client"],
  worker: ["worker"],
  client: ["client"],
};

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.user.role;
    const effectiveRoles = ROLE_HIERARCHY[userRole] || [];

    const hasAccess = allowedRoles.some((r) => effectiveRoles.includes(r));

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied",
        required: allowedRoles,
        yourRole: userRole,
      });
    }

    next();
  };
}

export function requireSelfOrRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.params.id === req.user.userId) {
      return next();
    }

    return requireRole(...roles)(req, res, next);
  };
}
