import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createResetToken() {
  const token = generateToken();
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

export function createInviteToken() {
  const token = generateToken();
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
