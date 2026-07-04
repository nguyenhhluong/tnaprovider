const loginAttempts = new Map();

const WINDOW_MS =
  (parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || "15") || 15) * 60 * 1000;
const MAX_ATTEMPTS =
  parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || "5") || 5;

export function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  const attempts = loginAttempts.get(ip).filter((t) => now - t < WINDOW_MS);
  loginAttempts.set(ip, attempts);

  if (attempts.length >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - attempts[0])) / 1000);
    return res.status(429).json({
      error: "Too many login attempts",
      retryAfterSeconds: retryAfter,
    });
  }

  next();
}

export function recordLoginAttempt(ip) {
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }
  loginAttempts.get(ip).push(Date.now());
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of loginAttempts) {
    const recent = attempts.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) {
      loginAttempts.delete(ip);
    } else {
      loginAttempts.set(ip, recent);
    }
  }
}, 5 * 60 * 1000);
