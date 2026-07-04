import { withServer, mustGetCookie, auth } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

async function check(label, url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (res.status !== 200) { fail++; console.error(`FAIL ${label}: status ${res.status}`); return null; }
    const text = await res.text();
    if (text.startsWith("<!DOCTYPE")) { fail++; console.error(`FAIL ${label}: got HTML`); return null; }
    pass++;
    return JSON.parse(text);
  } catch (e) { fail++; console.error(`FAIL ${label}: ${e.message}`); return null; }
}

await withServer({
  dbPath: "data/test-phase7h-api.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "Test Owner",
  },
}, async () => {
  const c = await mustGetCookie("owner@test.com", "ChangeMe123!", "owner");

  const email = await check("email/status", `${BASE}/api/email/status`);
  if (email && email.provider !== "mock") { fail++; console.error("FAIL: email provider not mock"); }

  await check("reports/dashboard", `${BASE}/api/reports/dashboard`, auth(c));
  await check("quotes", `${BASE}/api/quotes`, auth(c));
  await check("tasks", `${BASE}/api/tasks`, auth(c));
  await check("documents", `${BASE}/api/documents`, auth(c));
  await check("pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`, auth(c));
  await check("sites", `${BASE}/api/realtime-timesheets/sites`, auth(c));
  await check("payroll-summary", `${BASE}/api/realtime-timesheets/payroll/summary`, auth(c));

  const dash = await check("dashboard", `${BASE}/api/reports/dashboard`, auth(c));
  if (dash && typeof dash !== "object") { fail++; console.error("FAIL: dashboard not object"); }
});

console.log(`API contracts: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
