import { withServer } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
const MARKETING = ["/", "/about", "/services", "/sectors", "/projects", "/contact", "/privacy-policy", "/terms-of-service", "/faq"];
const APP = ["/login", "/", "/dashboard", "/leads", "/lead-automation", "/quotes", "/projects", "/tasks", "/documents", "/notifications", "/reports", "/realtime-timesheet", "/admin-realtime-timesheets", "/pay-rules", "/payroll-summary", "/client-portal", "/maintenance", "/analytics", "/email", "/users", "/security", "/settings", "/audit", "/admin-tools", "/employee-rates", "/admin-site-qr", "/profile"];

let pass = 0, fail = 0;

await withServer({ dbPath: "data/test-phase7h-routes.db" }, async () => {
  for (const r of MARKETING) {
    const res = await fetch(`${BASE}${r}`);
    if (res.status === 200 || res.status === 301 || res.status === 302) pass++; else { fail++; console.error(`FAIL ${r}: ${res.status}`); }
  }
  for (const r of APP) {
    const res = await fetch(`${BASE}${r}`, { redirect: "manual" });
    if (res.status === 200 || res.status === 301 || res.status === 302) pass++; else { fail++; console.error(`FAIL ${r}: ${res.status}`); }
  }
});

console.log(`Routes: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
