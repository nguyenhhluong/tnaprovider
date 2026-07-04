import { spawn } from "child_process";
import crypto from "crypto";
import bcrypt from "bcrypt";
import Database from "better-sqlite3";
import { existsSync, unlinkSync } from "fs";

const BASE = "http://127.0.0.1:3007";
const DB_PATH = "data/test-phase7h-roles.db";
let pass = 0, fail = 0;
let server;

async function fetchStatus(label, url, opts = {}, expected) {
  try {
    const res = await fetch(url, opts);
    if (res.status === expected) pass++;
    else { fail++; console.error(`FAIL ${label}: expected ${expected} got ${res.status}`); }
  } catch (e) { fail++; console.error(`FAIL ${label}: ${e.message}`); }
}

// Setup test DB
if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
process.env.DATABASE_URL = DB_PATH;
process.env.APP_ENV = "development";
process.env.SESSION_SECRET = "phase7h-role-test";
process.env.MAIL_PROVIDER = "mock";
process.env.VITE_EMAIL_MOCK_MODE = "true";
process.env.HOST = "127.0.0.1";
process.env.PORT = "3007";

// Migrate and seed
const { migrate } = await import("../../server/db/migrate.js");
migrate();
process.env.SEED_OWNER_EMAIL = "owner@example.com";
process.env.SEED_OWNER_PASSWORD = "TestPass123!";
process.env.SEED_OWNER_NAME = "Test Owner";
const { seed } = await import("../../server/db/seed.js");
seed();

// Create additional test users
const db = new Database(DB_PATH);
const now = new Date().toISOString();
const pw = bcrypt.hashSync("Test1234!", 12);
const users = [
  ["manager@test.com","Mgr User","manager",0],["worker@test.com","Wkr User","worker",0],
  ["client@test.com","Cli User","client",0],["mustchange@test.com","Must User","worker",1]
];
for (const [e,n,r,m] of users) {
  db.prepare("INSERT INTO users (id,email,name,role,password_hash,status,must_change_password,created_at,updated_at) VALUES (?,?,?,?,?,'active',?,?,?)")
    .run(crypto.randomUUID(),e,n,r,pw,m,now,now);
}
db.close();

// Start server
server = spawn("node", ["server.js"], { stdio: "pipe", env: process.env });
await new Promise(r => setTimeout(r, 5000));

async function getCookie(email, pass) {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pass }) });
  const setCookie = res.headers.get("set-cookie") || "";
  return setCookie.split(";")[0];
}

const cOwner = await getCookie("owner@example.com", "TestPass123!");
const cManager = await getCookie("manager@test.com", "Test1234!");
const cWorker = await getCookie("worker@test.com", "Test1234!");
const cClient = await getCookie("client@test.com", "Test1234!");
const cMust = await getCookie("mustchange@test.com", "Test1234!");

const auth = (c) => c ? { headers: { Cookie: c } } : {};

// Owner tests
await fetchStatus("owner reports", `${BASE}/api/reports/dashboard`, auth(cOwner), 200);
await fetchStatus("owner quotes", `${BASE}/api/quotes`, auth(cOwner), 200);
await fetchStatus("owner tasks", `${BASE}/api/tasks`, auth(cOwner), 200);
await fetchStatus("owner documents", `${BASE}/api/documents`, auth(cOwner), 200);
await fetchStatus("owner pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cOwner), 200);
await fetchStatus("owner users", `${BASE}/api/platform/users`, auth(cOwner), 200);
await fetchStatus("owner admin", `${BASE}/api/admin-tools/health`, auth(cOwner), 200);

// Manager tests
await fetchStatus("mgr reports", `${BASE}/api/reports/dashboard`, auth(cManager), 200);
await fetchStatus("mgr admin-realtime", `${BASE}/api/realtime-timesheets/admin/active`, auth(cManager), 200);
await fetchStatus("mgr users (blocked)", `${BASE}/api/platform/users`, auth(cManager), 403);
await fetchStatus("mgr pay-rules (blocked)", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cManager), 403);

// Worker tests
await fetchStatus("wkr realtime", `${BASE}/api/realtime-timesheets/active`, auth(cWorker), 200);
await fetchStatus("wkr admin-realtime (blocked)", `${BASE}/api/realtime-timesheets/admin/active`, auth(cWorker), 403);
await fetchStatus("wkr reports (blocked)", `${BASE}/api/reports/dashboard`, auth(cWorker), 403);
await fetchStatus("wkr quotes (blocked)", `${BASE}/api/quotes`, auth(cWorker), 403);
await fetchStatus("wkr documents (blocked)", `${BASE}/api/documents`, auth(cWorker), 403);
await fetchStatus("wkr pay-rules (blocked)", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cWorker), 403);

// Client tests
await fetchStatus("cli client-portal", `${BASE}/api/client-portal/projects`, auth(cClient), 200);
await fetchStatus("cli reports (blocked)", `${BASE}/api/reports/dashboard`, auth(cClient), 403);
await fetchStatus("cli quotes (blocked)", `${BASE}/api/quotes`, auth(cClient), 403);
await fetchStatus("cli tasks (blocked)", `${BASE}/api/tasks`, auth(cClient), 403);
await fetchStatus("cli realtime (blocked)", `${BASE}/api/realtime-timesheets/active`, auth(cClient), 403);
await fetchStatus("cli pay-rules (blocked)", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cClient), 403);

// Forced-password-change tests
await fetchStatus("must auth/me", `${BASE}/api/auth/me`, auth(cMust), 200);
await fetchStatus("must reports (blocked)", `${BASE}/api/reports/dashboard`, auth(cMust), 403);
await fetchStatus("must realtime (blocked)", `${BASE}/api/realtime-timesheets/active`, auth(cMust), 403);
await fetchStatus("must pay-rules (blocked)", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cMust), 403);

// Unauth tests
await fetchStatus("unauth reports", `${BASE}/api/reports/dashboard`, {}, 401);
await fetchStatus("unauth quotes", `${BASE}/api/quotes`, {}, 401);

// Cleanup
server.kill("SIGTERM");
if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

console.log(`\nRole access: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
