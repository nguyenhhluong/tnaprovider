import { withServer, mustGetCookie, auth } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

async function api(method, path, body, cookie) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  if (cookie) opts.headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  return { status: res.status, data };
}

await withServer({
  dbPath: "data/test-phase7h-payroll.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "Test Owner",
  },
}, async () => {
  const c = await mustGetCookie("owner@test.com", "ChangeMe123!", "owner");

  // 1. Create rule with DT after 10
  const r1 = await api("POST", "/api/realtime-timesheets/pay-rules", {
    name: "Test Rule", ordinary_hours_per_day: 7.6, overtime_daily_after_hours: 7.6,
    overtime_rate_multiplier: 1.5, double_time_after_hours: 10, double_time_multiplier: 2, is_active: 1
  }, c);
  if (r1.status === 201 && r1.data?.double_time_after_hours === 10) pass++;
  else { fail++; console.error("FAIL: create rule with DT 10"); }

  // 2. Verify active count = 1
  const list1 = await api("GET", "/api/realtime-timesheets/pay-rules", null, c);
  const active1 = list1.data?.filter(r => r.is_active).length;
  if (active1 === 1) pass++; else { fail++; console.error("FAIL: active count not 1"); }

  // 3. Clear DT
  const id = list1.data?.[0]?.id;
  const r2 = await api("PUT", `/api/realtime-timesheets/pay-rules/${id}`, { double_time_after_hours: null }, c);
  if (r2.status === 200 && r2.data?.double_time_after_hours === null) pass++;
  else { fail++; console.error("FAIL: clear DT to null"); }

  // 4. Verify GET still null
  const list2 = await api("GET", "/api/realtime-timesheets/pay-rules", null, c);
  const dtVal = list2.data?.find(r => r.id === id)?.double_time_after_hours;
  if (dtVal === null) pass++; else { fail++; console.error("FAIL: reload DT not null"); }

  // 5. Invalid DT <= OT
  const r3 = await api("POST", "/api/realtime-timesheets/pay-rules", {
    name: "Bad", ordinary_hours_per_day: 7.6, overtime_daily_after_hours: 7.6,
    overtime_rate_multiplier: 1.5, double_time_after_hours: 7.6, double_time_multiplier: 2
  }, c);
  if (r3.status === 400) pass++; else { fail++; console.error("FAIL: invalid DT not rejected"); }

  // 6. Zero required number
  const r4 = await api("POST", "/api/realtime-timesheets/pay-rules", {
    name: "Bad2", ordinary_hours_per_day: 0, overtime_daily_after_hours: 7.6,
    overtime_rate_multiplier: 1.5, double_time_after_hours: null, double_time_multiplier: 2
  }, c);
  if (r4.status === 400) pass++; else { fail++; console.error("FAIL: zero not rejected"); }

  // 7. Second active rule
  const r5 = await api("POST", "/api/realtime-timesheets/pay-rules", {
    name: "Active 2", ordinary_hours_per_day: 8, overtime_daily_after_hours: 8,
    overtime_rate_multiplier: 1.5, double_time_after_hours: null, double_time_multiplier: 2, is_active: 1
  }, c);
  const list3 = await api("GET", "/api/realtime-timesheets/pay-rules", null, c);
  const active2 = list3.data?.filter(r => r.is_active).length;
  if (active2 === 1 && r5.status === 201) pass++; else { fail++; console.error("FAIL: second active broke uniqueness"); }

  // 8. Old rule inactive
  const firstActive = list3.data?.find(r => r.name === "Test Rule")?.is_active;
  if (firstActive === 0) pass++; else { fail++; console.error("FAIL: old rule not deactivated"); }

  // 9. Payroll calculation via exported helper
  const { calculatePayBreakdownServer } = await import("../../server/routes/realtimeTimesheets.js");
  const HR = 40;
  const p1 = calculatePayBreakdownServer(11 * 3600, HR, {
    ordinary_hours_per_day: 7.6, overtime_daily_after_hours: 7.6,
    overtime_rate_multiplier: 1.5, double_time_after_hours: 10, double_time_multiplier: 2
  });
  if (p1.basePay === 304 && p1.overtimePay === 144 && p1.doubleTimePay === 80) pass++;
  else { fail++; console.error(`FAIL: DT 10 expected 304/144/80 got ${p1.basePay}/${p1.overtimePay}/${p1.doubleTimePay}`); }

  const p2 = calculatePayBreakdownServer(11 * 3600, HR, {
    ordinary_hours_per_day: 7.6, overtime_daily_after_hours: 7.6,
    overtime_rate_multiplier: 1.5, double_time_after_hours: null, double_time_multiplier: 2
  });
  if (p2.basePay === 304 && p2.overtimePay === 204 && p2.doubleTimePay === 0) pass++;
  else { fail++; console.error(`FAIL: DT null expected 304/204/0 got ${p2.basePay}/${p2.overtimePay}/${p2.doubleTimePay}`); }
});

console.log(`Payroll: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
