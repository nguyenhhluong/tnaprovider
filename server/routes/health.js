import { Router } from "express";
import { getDb } from "../db/database.js";
import { verifySchemaContract, EXPECTED_MIGRATIONS } from "../db/schema-contract.js";

const router = Router();

router.get("/live", (req, res) => {
  res.json({ status: "alive" });
});

router.get("/ready", (req, res) => {
  const checks = {
    database: false,
    migrations: false,
    migration_count: false,
    tables: false,
    contract: false,
    foreign_keys: false,
    integrity: false,
  };

  try {
    const db = getDb();

    db.prepare("SELECT 1").get();
    checks.database = true;

    const applied = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
    checks.migration_count = applied.length >= EXPECTED_MIGRATIONS.length;
    checks.migrations = EXPECTED_MIGRATIONS.every((em) =>
      applied.some((a) => a.version === em.version && a.name === em.name)
    );

    const required = ["users", "sessions", "leads", "projects", "quotes", "shift_sessions", "contact_requests"];
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
    checks.tables = required.every((t) => tables.includes(t));

    const contractErrors = verifySchemaContract(db);
    checks.contract = contractErrors.length === 0;

    const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
    checks.foreign_keys = fkErrors.length === 0;

    const integrityRows = db.prepare("PRAGMA integrity_check").all();
    checks.integrity = integrityRows.length === 1 && integrityRows[0]["integrity_check"] === "ok";
  } catch {
    // remain false
  }

  const allOk = Object.values(checks).every(Boolean);
  res.status(allOk ? 200 : 503).json({ status: allOk ? "ready" : "not ready", ...checks });
});

export default router;
