import { createServer, request } from "http";
import { spawn } from "child_process";
import { readFileSync, unlinkSync, existsSync } from "fs";

const BASE = "http://127.0.0.1:3007";
const MARKETING_ROUTES = ["/", "/about", "/services", "/sectors", "/projects", "/contact", "/privacy-policy", "/terms-of-service", "/faq"];
const APP_ROUTES = ["/login", "/", "/dashboard", "/leads", "/lead-automation", "/quotes", "/projects", "/tasks", "/documents", "/notifications", "/reports", "/realtime-timesheet", "/admin-realtime-timesheets", "/pay-rules", "/payroll-summary", "/client-portal", "/maintenance", "/analytics", "/email", "/users", "/security", "/settings", "/audit", "/admin-tools", "/employee-rates", "/admin-site-qr", "/profile"];

let pass = 0, fail = 0;

async function check(label, url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (res.status === 200 || res.status === 301 || res.status === 302) pass++;
    else { fail++; console.error(`FAIL ${label}: ${res.status} ${url}`); }
  } catch (e) {
    fail++; console.error(`FAIL ${label}: ${e.message} ${url}`);
  }
}

for (const r of MARKETING_ROUTES) await check(`marketing ${r}`, `http://127.0.0.1:3007${r}`, { redirect: "manual" });
for (const r of APP_ROUTES) await check(`app ${r}`, `http://127.0.0.1:3007${r}`, { redirect: "manual" });

console.log(`\nRoutes: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
