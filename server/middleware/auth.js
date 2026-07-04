import { validateSession } from "../auth/session.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.[process.env.SESSION_COOKIE_NAME || "tna_session"];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const session = validateSession(token);

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  req.user = session;
  next();
}

export function optionalAuth(req, res, next) {
  const token = req.cookies?.[process.env.SESSION_COOKIE_NAME || "tna_session"];

  if (token) {
    const session = validateSession(token);
    if (session) {
      req.user = session;
    }
  }

  next();
}
