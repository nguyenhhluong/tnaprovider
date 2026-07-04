const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

async function check(label, url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (res.status !== 200) { fail++; console.error(`FAIL ${label}: status ${res.status}`); return null; }
    const text = await res.text();
    if (text.startsWith("<!DOCTYPE")) { fail++; console.error(`FAIL ${label}: got HTML instead of JSON`); return null; }
    pass++;
    return JSON.parse(text);
  } catch (e) { fail++; console.error(`FAIL ${label}: ${e.message}`); return null; }
}

// Email status
const email = await check("email/status", `${BASE}/api/email/status`);
if (email && email.provider !== "mock") { fail++; console.error("FAIL email/status: provider is not mock"); }

// Reports dashboard
const rd = await check("reports/dashboard", `${BASE}/api/reports/dashboard`);
if (rd && typeof rd !== "object") { fail++; console.error("FAIL reports/dashboard: not object"); }

// Pay rules
const pr = await check("pay-rules", `${BASE}/api/realtime-timesheets/pay-rules`);
if (pr && !Array.isArray(pr)) { fail++; console.error("FAIL pay-rules: not array"); }

// Sites
const sites = await check("sites", `${BASE}/api/realtime-timesheets/sites`);
if (sites && !Array.isArray(sites)) { fail++; console.error("FAIL sites: not array"); }

console.log(`\nAPI contracts: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
