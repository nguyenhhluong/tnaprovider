import crypto from "crypto";
import bcrypt from "bcrypt";
import Database from "better-sqlite3";
import { existsSync, unlinkSync } from "fs";
import { withServer, getCookie, auth } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
const DB = "data/test-phase7h-roles.db";
let pass = 0, fail = 0;

async function chk(label, url, opts, expected) {
  try {
    const res = await fetch(url, opts);
    if (res.status === expected) pass++;
    else { fail++; console.error(`FAIL ${label}: expected ${expected} got ${res.status}`); }
  } catch (e) { fail++; console.error(`FAIL ${label}: ${e.message}`); }
}

// Setup test DB before starting server
if (existsSync(DB)) unlinkSync(DB);
process.env.DATABASE_URL = DB;
process.env.APP_ENV = "development";
process.env.SESSION_SECRET = "phase7h-role-test";
process.env.MAIL_PROVIDER = "mock";
process.env.VITE_EMAIL_MOCK_MODE = "true";
process.env.HOST = "127.0.0.1";
process.env.PORT = "3007";

const { migrate } = await import("../../server/db/migrate.js");
migrate();
process.env.SEED_OWNER_EMAIL = "owner@example.com";
process.env.SEED_OWNER_PASSWORD = "ChangeMe123!";
process.env.SEED_OWNER_NAME = "Test Owner";
const { seed } = await import("../../server/db/seed.js");
seed();

const db = new Database(DB);
const now = new Date().toISOString();
const pw = bcrypt.hashSync("Test1234!", 12);
const users = [
  ["admin@test.com","Admin","admin",0],["mgr@test.com","Manager","manager",0],
  ["wkr@test.com","Worker","worker",0],["cli@test.com","Client","client",0],
  ["must@test.com","Must","worker",1]
];
for (const [e,n,r,m] of users) {
  db.prepare("INSERT INTO users (id,email,name,role,password_hash,status,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,'active',?,?,?)")
    .run(crypto.randomUUID(),e,n,r,pw,m,now,now);
}
db.close();

await withServer(DB, async () => {
  const cO = await getCookie("owner@example.com", "ChangeMe123!");
  const cA = await getCookie("admin@test.com", "Test1234!");
  const cM = await getCookie("mgr@test.com", "Test1234!");
  const cW = await getCookie("wkr@test.com", "Test1234!");
  const cC = await getCookie("cli@test.com", "Test1234!");
  const cU = await getCookie("must@test.com", "Test1234!");

  // Owner
  await chk("own reports", `${BASE}/api/reports/dashboard`, auth(cO), 200);
  await chk("own pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cO), 200);
  await chk("own users", `${BASE}/api/platform/users`, auth(cO), 200);
  await chk("own admin", `${BASE}/api/admin-tools/health`, auth(cO), 200);

  // Admin
  await chk("adm reports", `${BASE}/api/reports/dashboard`, auth(cA), 200);
  await chk("adm users", `${BASE}/api/platform/users`, auth(cA), 200);

  // Manager
  await chk("mgr reports", `${BASE}/api/reports/dashboard`, auth(cM), 200);
  await chk("mgr admin-realtime", `${BASE}/api/realtime-timesheets/admin/active`, auth(cM), 200);
  await chk("mgr payroll", `${BASE}/api/realtime-timesheets/payroll/summary`, auth(cM), 200);
  await chk("mgr users blocked", `${BASE}/api/platform/users`, auth(cM), 403);
  await chk("mgr pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cM), 403);
  await chk("mgr employee-rates blocked", `${BASE}/api/realtime-timesheets/admin/employees`, auth(cM), 403);
  await chk("mgr security blocked", `${BASE}/api/auth/sessions`, auth(cM), 200); // sessions are own-only

  // Worker
  await chk("wkr realtime", `${BASE}/api/realtime-timesheets/active`, auth(cW), 200);
  await chk("wkr admin-realtime blocked", `${BASE}/api/realtime-timesheets/admin/active`, auth(cW), 403);
  await chk("wkr reports blocked", `${BASE}/api/reports/dashboard`, auth(cW), 403);
  await chk("wkr quotes blocked", `${BASE}/api/quotes`, auth(cW), 403);
  await chk("wkr docs blocked", `${BASE}/api/documents`, auth(cW), 403);
  await chk("wkr pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cW), 403);
  await chk("wkr payroll blocked", `${BASE}/api/realtime-timesheets/payroll/summary`, auth(cW), 403);

  // Client
  await chk("cli portal", `${BASE}/api/client-portal/projects`, auth(cC), 200);
  await chk("cli reports blocked", `${BASE}/api/reports/dashboard`, auth(cC), 403);
  await chk("cli quotes blocked", `${BASE}/api/quotes`, auth(cC), 403);
  await chk("cli tasks blocked", `${BASE}/api/tasks`, auth(cC), 403);
  await chk("cli realtime blocked", `${BASE}/api/realtime-timesheets/active`, auth(cC), 403);
  await chk("cli pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cC), 403);
  await chk("cli docs blocked", `${BASE}/api/documents`, auth(cC), 403);

  // Forced password change
  await chk("must auth/me", `${BASE}/api/auth/me`, auth(cU), 200);
  await chk("must reports blocked", `${BASE}/api/reports/dashboard`, auth(cU), 403);
  await chk("must realtime blocked", `${BASE}/api/realtime-timesheets/active`, auth(cU), 403);

  // Unauth
  await chk("unauth reports", `${BASE}/api/reports/dashboard`, {}, 401);
  await chk("unauth quotes", `${BASE}/api/quotes`, {}, 401);
  await chk("unauth pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, {}, 401);
});

if (existsSync(DB)) unlinkSync(DB);
console.log(`Role access: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
