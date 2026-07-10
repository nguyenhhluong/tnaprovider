import { Router } from "express";
import { getDb } from "../db/database.js";

const router = Router();

const EXPECTED_MIGRATIONS = [
  { version: "001", name: "initial-schema" },
  { version: "002", name: "auth-invites" },
  { version: "003", name: "client-portal" },
  { version: "004", name: "realtime-timesheets" },
  { version: "005", name: "pay-rules" },
  { version: "006", name: "platform-modules" },
  { version: "007", name: "contact-requests" },
  { version: "008", name: "professional-quotes" },
];

const CRITICAL_COLUMNS = [
  { table: "users", column: "hourly_rate" },
  { table: "users", column: "must_change_password" },
  { table: "users", column: "invited_at" },
  { table: "work_sites", column: "qr_token" },
  { table: "shift_sessions", column: "base_seconds" },
  { table: "shift_sessions", column: "overtime_seconds" },
  { table: "shift_sessions", column: "double_time_seconds" },
  { table: "quotes", column: "quote_number" },
  { table: "quotes", column: "client_email" },
];

const REQUIRED_TABLES = ["users", "sessions", "leads", "projects", "quotes", "shift_sessions", "contact_requests", "quote_sections", "quote_review_events"];

router.get("/live", (req, res) => {
  res.json({ status: "alive" });
});

router.get("/ready", (req, res) => {
  const checks = {
    database: false,
    migrations: false,
    migration_versions: false,
    tables: false,
    columns: false,
    foreign_keys: false,
    integrity: false,
    config: true,
  };

  try {
    const db = getDb();

    db.prepare("SELECT 1").get();
    checks.database = true;

    // Verify all 8 migration versions by name
    const applied = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
    checks.migrations = applied.length >= EXPECTED_MIGRATIONS.length;
    checks.migration_versions = EXPECTED_MIGRATIONS.every((em) =>
      applied.some((a) => a.version === em.version && a.name === em.name)
    );

    // Verify required tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
    checks.tables = REQUIRED_TABLES.every((t) => tables.includes(t));

    // Verify critical columns
    checks.columns = CRITICAL_COLUMNS.every(({ table, column }) => {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
      return cols.includes(column);
    });

    // Foreign key check
    const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
    checks.foreign_keys = fkErrors.length === 0;

    // Integrity check
    const integrityRows = db.prepare("PRAGMA integrity_check").all();
    checks.integrity = integrityRows.length === 1 && integrityRows[0]["integrity_check"] === "ok";
  } catch {
    // checks remain false
  }

  const allOk = checks.database && checks.migrations && checks.migration_versions && checks.tables && checks.columns && checks.foreign_keys && checks.integrity && checks.config;

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "not ready",
    ...checks,
  });
});

export default router;
