import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createResetToken() {
  return {
    token: generateToken(),
    hash: hashToken,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  };
}

export function createInviteToken() {
  return {
    token: generateToken(),
    hash: hashToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
}
