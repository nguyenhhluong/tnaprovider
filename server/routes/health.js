import { Router } from "express";
import { getDb } from "../db/database.js";

const router = Router();

router.get("/live", (req, res) => {
  res.json({ status: "alive" });
});

router.get("/ready", (req, res) => {
  const checks = {
    migrations: false,
    database: false,
    tables: false,
    config: true,
  };

  try {
    const db = getDb();

    db.prepare("SELECT 1").get();
    checks.database = true;

    const { c } = db.prepare("SELECT COUNT(*) as c FROM schema_migrations").get();
    checks.migrations = c > 0;

    const required = ["users", "sessions", "leads", "projects", "quotes", "shift_sessions"];
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    checks.tables = required.every((t) => tables.includes(t));
  } catch {
    // checks remain false
  }

  const allOk = checks.database && checks.migrations && checks.tables && checks.config;

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "not ready",
    ...checks,
  });
});

export default router;
