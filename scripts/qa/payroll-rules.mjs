import { spawn } from "child_process";
import { existsSync, unlinkSync } from "fs";
import crypto from "crypto";
import Database from "better-sqlite3";

const BASE = "http://127.0.0.1:3007";
const DB_PATH = "data/test-phase7h-payroll.db";
let pass = 0, fail = 0;
let server;

async function api(method, path, body, cookie) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  if (cookie) opts.headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") || "" };
}

async function getCookie(email, pass) {
  const { setCookie } = await api("POST", "/api/auth/login", { email, password: pass });
  return setCookie.split(";")[0];
}

// Setup
if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
process.env.DATABASE_URL = DB_PATH;
process.env.APP_ENV = "development";
process.env.SESSION_SECRET = "phase7h-payroll-test";
process.env.MAIL_PROVIDER = "mock";
process.env.VITE_EMAIL_MOCK_MODE = "true";
process.env.HOST = "127.0.0.1";
process.env.PORT = "3007";

await import("../../server/db/migrate.js");
const { seed } = await import("../../server/db/seed.js");
process.env.SEED_OWNER_EMAIL = "owner@test.com";
process.env.SEED_OWNER_PASSWORD = "TestPass123!";
process.env.SEED_OWNER_NAME = "Test Owner";
seed();

server = spawn("node", ["server.js"], { stdio: "inherit", env: process.env });
await new Promise(r => setTimeout(r, 5000));

const c = await getCookie("owner@test.com", "TestPass123!");
if (!c) { fail++; console.error("FAIL: owner login"); }

// Create rule with DT after 10
const r1 = await api("POST", "/api/realtime-timesheets/pay-rules", {
  name: "Test Rule", ordinary_hours_per_day: 7.6, overtime_daily_after_hours: 7.6,
  overtime_rate_multiplier: 1.5, double_time_after_hours: 10, double_time_multiplier: 2, is_active: 1
}, c);
if (r1.status === 201 && r1.data?.double_time_after_hours === 10) pass++;
else { fail++; console.error("FAIL: create rule with DT 10"); }

// Verify active count = 1
const list1 = await api("GET", "/api/realtime-timesheets/pay-rules", null, c);
const active1 = list1.data?.filter(r => r.is_active).length;
if (active1 === 1) pass++; else { fail++; console.error("FAIL: active count not 1"); }

// Clear DT
const id = list1.data?.[0]?.id;
const r2 = await api("PUT", `/api/realtime-timesheets/pay-rules/${id}`, { double_time_after_hours: null }, c);
if (r2.status === 200 && r2.data?.double_time_after_hours === null) pass++;
else { fail++; console.error("FAIL: clear DT to null"); }

// Verify GET returns null
const list2 = await api("GET", "/api/realtime-timesheets/pay-rules", null, c);
const dtVal = list2.data?.find(r => r.id === id)?.double_time_after_hours;
if (dtVal === null) pass++; else { fail++; console.error("FAIL: reload shows DT still null"); }

// Invalid DT <= OT
const r3 = await api("POST", "/api/realtime-timesheets/pay-rules", {
  name: "Bad", ordinary_hours_per_day: 7.6, overtime_daily_after_hours: 7.6,
  overtime_rate_multiplier: 1.5, double_time_after_hours: 7.6, double_time_multiplier: 2
}, c);
if (r3.status === 400) pass++; else { fail++; console.error("FAIL: invalid DT not rejected"); }

// Zero required number
const r4 = await api("POST", "/api/realtime-timesheets/pay-rules", {
  name: "Bad2", ordinary_hours_per_day: 0, overtime_daily_after_hours: 7.6,
  overtime_rate_multiplier: 1.5, double_time_after_hours: null, double_time_multiplier: 2
}, c);
if (r4.status === 400) pass++; else { fail++; console.error("FAIL: zero not rejected"); }

// Create second active rule
const r5 = await api("POST", "/api/realtime-timesheets/pay-rules", {
  name: "Active 2", ordinary_hours_per_day: 8, overtime_daily_after_hours: 8,
  overtime_rate_multiplier: 1.5, double_time_after_hours: null, double_time_multiplier: 2, is_active: 1
}, c);
const list3 = await api("GET", "/api/realtime-timesheets/pay-rules", null, c);
const active2 = list3.data?.filter(r => r.is_active).length;
if (active2 === 1 && r5.status === 201) pass++;
else { fail++; console.error("FAIL: second active rule broke uniqueness"); }

// Verify first rule now inactive
const firstActive = list3.data?.find(r => r.name === "Test Rule")?.is_active;
if (firstActive === 0) pass++; else { fail++; console.error("FAIL: old rule not deactivated"); }

console.log(`\nPay Rules: ${pass} passed, ${fail} failed`);
server.kill();
if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
process.exit(fail > 0 ? 1 : 0);
