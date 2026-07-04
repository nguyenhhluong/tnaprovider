import crypto from "crypto";
import { getDb } from "../db/database.js";

export function createAuditLog({ userId, action, entityType, entityId, metadata, ip, userAgent }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata_json, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId || null,
    action,
    entityType,
    entityId || null,
    metadata ? JSON.stringify(metadata) : null,
    ip || null,
    userAgent || null,
    now
  );

  return id;
}
