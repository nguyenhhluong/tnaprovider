import { withServer, mustGetCookie, auth } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

async function chk(label, url, opts, expected) {
  try {
    const res = await fetch(url, opts);
    if (res.status === expected) pass++;
    else { fail++; console.error(`FAIL ${label}: expected ${expected} got ${res.status}`); }
  } catch (e) { fail++; console.error(`FAIL ${label}: ${e.message}`); }
}

const USERS = [
  { email: "owner@test.com", password: "ChangeMe123!", name: "Test Owner", role: "owner" },
  { email: "admin@test.com", password: "AdminPass1!", name: "Test Admin", role: "admin" },
  { email: "mgr@test.com", password: "MgrPass1!", name: "Test Manager", role: "manager" },
  { email: "wkr@test.com", password: "WkrPass1!", name: "Test Worker", role: "worker" },
  { email: "cli@test.com", password: "CliPass1!", name: "Test Client", role: "client" },
  { email: "must@test.com", password: "MustPass1!", name: "Test Must Change", role: "worker", mustChangePassword: true },
];

await withServer({
  dbPath: "data/test-phase7h-roles.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "Test Owner",
  },
  setupUsers: USERS.slice(1),
}, async () => {
  const cO = await mustGetCookie("owner@test.com", "ChangeMe123!", "owner");
  const cA = await mustGetCookie("admin@test.com", "AdminPass1!", "admin");
  const cM = await mustGetCookie("mgr@test.com", "MgrPass1!", "manager");
  const cW = await mustGetCookie("wkr@test.com", "WkrPass1!", "worker");
  const cC = await mustGetCookie("cli@test.com", "CliPass1!", "client");
  const cU = await mustGetCookie("must@test.com", "MustPass1!", "must-change");

  // ── Owner (via seeded user) ──
  await chk("own reports", `${BASE}/api/reports/dashboard`, auth(cO), 200);
  await chk("own quotes", `${BASE}/api/quotes`, auth(cO), 200);
  await chk("own tasks", `${BASE}/api/tasks`, auth(cO), 200);
  await chk("own documents", `${BASE}/api/documents`, auth(cO), 200);
  await chk("own pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cO), 200);
  await chk("own users", `${BASE}/api/platform/users`, auth(cO), 200);
  await chk("own admin", `${BASE}/api/admin-tools/health`, auth(cO), 200);

  // ── Admin ──
  await chk("adm reports", `${BASE}/api/reports/dashboard`, auth(cA), 200);
  await chk("adm quotes", `${BASE}/api/quotes`, auth(cA), 200);
  await chk("adm tasks", `${BASE}/api/tasks`, auth(cA), 200);
  await chk("adm documents", `${BASE}/api/documents`, auth(cA), 200);
  await chk("adm pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cA), 200);
  await chk("adm users", `${BASE}/api/platform/users`, auth(cA), 200);
  await chk("adm admin", `${BASE}/api/admin-tools/health`, auth(cA), 200);

  // ── Manager: allowed endpoints ──
  await chk("mgr reports", `${BASE}/api/reports/dashboard`, auth(cM), 200);
  await chk("mgr quotes", `${BASE}/api/quotes`, auth(cM), 200);
  await chk("mgr tasks", `${BASE}/api/tasks`, auth(cM), 200);
  await chk("mgr documents", `${BASE}/api/documents`, auth(cM), 200);
  await chk("mgr admin-realtime", `${BASE}/api/realtime-timesheets/admin/active`, auth(cM), 200);

  // Manager: blocked endpoints
  await chk("mgr pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cM), 403);
  await chk("mgr users blocked", `${BASE}/api/platform/users`, auth(cM), 403);
  await chk("mgr admin-tools blocked", `${BASE}/api/admin-tools/health`, auth(cM), 403);
  await chk("mgr emp-rates blocked", `${BASE}/api/realtime-timesheets/admin/employees/test/rate`, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cM }, body: "{}" }, 403);
  await chk("mgr site-qr blocked", `${BASE}/api/realtime-timesheets/sites/test/qr-token`, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cM }, body: "{}" }, 403);

  // ── Worker: allowed ──
  await chk("wkr my-realtime", `${BASE}/api/realtime-timesheets/active`, auth(cW), 200);

  // Worker: blocked
  await chk("wkr admin-realtime blocked", `${BASE}/api/realtime-timesheets/admin/active`, auth(cW), 403);
  await chk("wkr reports blocked", `${BASE}/api/reports/dashboard`, auth(cW), 403);
  await chk("wkr quotes blocked", `${BASE}/api/quotes`, auth(cW), 403);
  await chk("wkr documents blocked", `${BASE}/api/documents`, auth(cW), 403);
  await chk("wkr pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cW), 403);
  await chk("wkr payroll-summary blocked", `${BASE}/api/realtime-timesheets/payroll/summary`, auth(cW), 403);
  await chk("wkr users blocked", `${BASE}/api/platform/users`, auth(cW), 403);
  await chk("wkr admin-tools blocked", `${BASE}/api/admin-tools/health`, auth(cW), 403);

  // ── Client: allowed ──
  await chk("cli portal", `${BASE}/api/client-portal/projects`, auth(cC), 200);

  // Client: blocked
  await chk("cli reports blocked", `${BASE}/api/reports/dashboard`, auth(cC), 403);
  await chk("cli quotes blocked", `${BASE}/api/quotes`, auth(cC), 403);
  await chk("cli tasks blocked", `${BASE}/api/tasks`, auth(cC), 403);
  await chk("cli documents (client-safe)", `${BASE}/api/documents`, auth(cC), 200);
  await chk("cli realtime blocked", `${BASE}/api/realtime-timesheets/active`, auth(cC), 403);
  await chk("cli pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cC), 403);
  await chk("cli payroll-summary blocked", `${BASE}/api/realtime-timesheets/payroll/summary`, auth(cC), 403);
  await chk("cli users blocked", `${BASE}/api/platform/users`, auth(cC), 403);
  await chk("cli admin-tools blocked", `${BASE}/api/admin-tools/health`, auth(cC), 403);

  // ── Forced password change ──
  await chk("must auth/me", `${BASE}/api/auth/me`, auth(cU), 200);
  await chk("must reports blocked", `${BASE}/api/reports/dashboard`, auth(cU), 403);
  await chk("must quotes blocked", `${BASE}/api/quotes`, auth(cU), 403);
  await chk("must tasks blocked", `${BASE}/api/tasks`, auth(cU), 403);
  await chk("must documents blocked", `${BASE}/api/documents`, auth(cU), 403);
  await chk("must realtime blocked", `${BASE}/api/realtime-timesheets/active`, auth(cU), 403);
  await chk("must pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cU), 403);

  // ── Unauthenticated ──
  await chk("unauth reports", `${BASE}/api/reports/dashboard`, {}, 401);
  await chk("unauth quotes", `${BASE}/api/quotes`, {}, 401);
  await chk("unauth tasks", `${BASE}/api/tasks`, {}, 401);
  await chk("unauth documents", `${BASE}/api/documents`, {}, 401);
  await chk("unauth realtime", `${BASE}/api/realtime-timesheets/active`, {}, 401);
  await chk("unauth pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, {}, 401);
  await chk("unauth users", `${BASE}/api/platform/users`, {}, 401);
  await chk("unauth admin-tools", `${BASE}/api/admin-tools/health`, {}, 401);
});

console.log(`Role access: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
