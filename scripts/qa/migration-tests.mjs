#!/usr/bin/env node
import { unlinkSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { migrate } from "../../server/db/migrate.js";
import { getDb, closeDb } from "../../server/db/database.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

let passed = 0;
let failed = 0;
const testDbPath = resolve(ROOT, `data/test-migration-${Date.now()}.db`);

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
  }
}

function removeDbFile() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = testDbPath + suffix;
    try { if (existsSync(p)) unlinkSync(p); } catch {}
  }
}

async function run() {
  removeDbFile();
  process.env.DATABASE_URL = testDbPath;
  closeDb();

  // ── Test 1: Fresh migration ──
  console.log("\n[Test 1] Fresh database migration");
  await migrate();

  const db = getDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  const expectedTables = [
    "schema_migrations", "users", "sessions", "leads", "projects", "timesheets",
    "maintenance_tickets", "audit_logs", "password_reset_tokens", "user_invite_tokens",
    "client_project_access", "project_updates", "project_update_comments",
    "project_variations", "client_portal_messages", "work_sites", "shift_sessions",
    "shift_events", "timesheet_adjustment_requests", "company_pay_rules",
    "shift_allowances", "payroll_export_batches", "offline_action_receipts",
    "lead_activities", "lead_followups", "quote_requests", "quotes", "quote_items",
    "quote_status_history", "project_task_templates", "project_template_tasks",
    "project_tasks", "project_task_comments", "document_folders", "documents",
    "proposal_templates", "proposal_versions", "notifications",
    "notification_preferences", "reminder_rules", "reminder_runs",
    "contact_requests", "quote_sections", "quote_documents", "quote_review_events",
    "quote_templates", "quote_template_items",
  ];
  const missing = expectedTables.filter(t => !tables.includes(t));
  assert("All expected tables exist after fresh migration", missing.length === 0);
  if (missing.length > 0) {
    console.log(`       Missing tables: ${missing.join(", ")}`);
  }

  // ── Test 2: Re-run migration (must be a no-op) ──
  console.log("\n[Test 2] Re-run migration (no-op)");
  const tableCountBefore = tables.length;
  await migrate();
  const tablesAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  assert("Re-running migration does not add new tables", tablesAfter.length === tableCountBefore);

  // ── Test 3: Foreign key check ──
  console.log("\n[Test 3] Foreign key check");
  const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
  assert("No foreign key violations", fkErrors.length === 0);
  if (fkErrors.length > 0) {
    console.log("       Violations:", JSON.stringify(fkErrors));
  }

  // ── Test 4: Database integrity check ──
  console.log("\n[Test 4] Database integrity check");
  const integrity = db.prepare("PRAGMA integrity_check").all();
  const ok = integrity.length === 1 && integrity[0] && integrity[0]["integrity_check"] === "ok";
  assert("Database integrity check passed", ok);
  if (!ok) console.log("       Result:", JSON.stringify(integrity));

  // ── Test 5: Schema migrations version count ──
  console.log("\n[Test 5] Schema migrations version count");
  const versions = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
  assert("All 8 versioned migrations applied", versions.length === 8);
  if (versions.length !== 8) {
    console.log("       Applied:", versions.map(v => `${v.version} ${v.name}`).join(", "));
  } else {
    console.log("       Versions:", versions.map(v => `${v.version}`).join(", "));
  }

  // Summary
  console.log(`\n${failed > 0 ? "FAIL" : "PASS"} \u2014 ${passed} passed, ${failed} failed\n`);
  removeDbFile();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Fatal error:", err.message);
  removeDbFile();
  process.exit(1);
});
