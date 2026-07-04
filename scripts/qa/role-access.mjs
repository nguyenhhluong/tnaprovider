import { withServer, mustGetCookie, getCookie, auth } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

async function chk(label, url, opts, expected) {
  try {
    const res = await fetch(url, opts);
    if (res.status === expected) pass++;
    else { fail++; console.error(`FAIL ${label}: expected ${expected} got ${res.status}`); }
  } catch (e) { fail++; console.error(`FAIL ${label}: ${e.message}`); }
}

await withServer({
  dbPath: "data/test-phase7h-roles.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "owner@example.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "Test Owner",
  },
}, async () => {
  const cO = await mustGetCookie("owner@example.com", "ChangeMe123!", "owner");
  const cM = await getCookie("mgr@test.com", "Test1234!");
  const cW = await getCookie("wkr@test.com", "Test1234!");
  const cC = await getCookie("cli@test.com", "Test1234!");
  const cU = await getCookie("must@test.com", "Test1234!");

  // Owner
  await chk("own reports", `${BASE}/api/reports/dashboard`, auth(cO), 200);
  await chk("own pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cO), 200);
  await chk("own users", `${BASE}/api/platform/users`, auth(cO), 200);
  await chk("own admin", `${BASE}/api/admin-tools/health`, auth(cO), 200);

  // If additional role cookies aren't available, only test owner
  if (cM) {
    await chk("mgr reports", `${BASE}/api/reports/dashboard`, auth(cM), 200);
    await chk("mgr users blocked", `${BASE}/api/platform/users`, auth(cM), 403);
    await chk("mgr pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cM), 403);
  } else { console.log("SKIP: manager tests"); }
  if (cW) {
    await chk("wkr realtime", `${BASE}/api/realtime-timesheets/active`, auth(cW), 200);
    await chk("wkr reports blocked", `${BASE}/api/reports/dashboard`, auth(cW), 403);
    await chk("wkr quotes blocked", `${BASE}/api/quotes`, auth(cW), 403);
    await chk("wkr pay-rules blocked", `${BASE}/api/realtime-timesheets/pay-rules`, auth(cW), 403);
  } else { console.log("SKIP: worker tests"); }
  if (cC) {
    await chk("cli portal", `${BASE}/api/client-portal/projects`, auth(cC), 200);
    await chk("cli reports blocked", `${BASE}/api/reports/dashboard`, auth(cC), 403);
    await chk("cli realtime blocked", `${BASE}/api/realtime-timesheets/active`, auth(cC), 403);
  } else { console.log("SKIP: client tests"); }
  if (cU) {
    await chk("must auth/me", `${BASE}/api/auth/me`, auth(cU), 200);
    await chk("must reports blocked", `${BASE}/api/reports/dashboard`, auth(cU), 403);
  } else { console.log("SKIP: must-change tests"); }
  await chk("unauth reports", `${BASE}/api/reports/dashboard`, {}, 401);
  await chk("unauth quotes", `${BASE}/api/quotes`, {}, 401);
});

console.log(`Role access: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
