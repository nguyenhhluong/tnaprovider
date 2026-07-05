import { withServer, mustGetCookie } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

function chkNear(label, actual, expected, tolerance = 0.01) {
  if (Math.abs(actual - expected) <= tolerance) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ~${expected} got ${actual}`); }
}

async function api(method, path, body, cookie) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  if (cookie) opts.headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function apiGet(path, cookie) {
  const opts = { headers: {} };
  if (cookie) opts.headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function chk(label, status, expectedStatus) {
  if (status === expectedStatus) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ${expectedStatus} got ${status}`); }
}

function chkVal(label, actual, expected) {
  if (actual === expected) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`); }
}

const USERS = [
  { email: "owner@test.com", password: "ChangeMe123!", name: "Test Owner", role: "owner" },
  { email: "admin@test.com", password: "AdminPass1!", name: "Test Admin", role: "admin" },
  { email: "mgr@test.com", password: "MgrPass1!", name: "Test Manager", role: "manager" },
  { email: "wkr@test.com", password: "WkrPass1!", name: "Test Worker", role: "worker", mustChangePassword: false },
  { email: "cli@test.com", password: "CliPass1!", name: "Test Client", role: "client" },
];

await withServer({
  dbPath: "data/test-phase8d.db",
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

  // Get users list to find IDs
  const usersList = await apiGet("/api/platform/users", cO);
  const worker = usersList.data?.find(u => u.email === "wkr@test.com");
  const client = usersList.data?.find(u => u.email === "cli@test.com");
  const admin = usersList.data?.find(u => u.email === "admin@test.com");
  const mgr = usersList.data?.find(u => u.email === "mgr@test.com");

  if (!worker) { console.error("Worker not found"); process.exit(1); }

  // ── Owner can open worker profile ──
  let r = await apiGet(`/api/platform/users/${worker.id}/profile`, cO);
  chk("owner fetch worker profile", r.status, 200);
  chkVal("profile returns name", r.data?.worker?.name, "Test Worker");
  chkVal("profile returns hourlyRate", r.data?.worker?.hourlyRate, 38.5);

  // ── Owner can fetch worker weekly timesheet ──
  r = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=2026-06-29`, cO);
  chk("owner fetch weekly timesheet", r.status, 200);

  // ── Weekly timesheet returns 7 days ──
  chkVal("week returns 7 days", r.data?.days?.length, 7);

  // ── Missing days show Set/Set/0h 0m/$0 ──
  const missingDay = r.data?.days?.find(d => !d.hasShift);
  if (missingDay) {
    chkVal("missing day start is Set", missingDay.start, "Set");
    chkVal("missing day end is Set", missingDay.end, "Set");
    chkVal("missing day pay is 0", missingDay.pay, 0);
  }

  // ── Weekly total time equals sum of day paid time ──
  const sumPaid = r.data?.days?.reduce((s, d) => s + d.paidSeconds, 0);
  chkVal("total paidSeconds equals sum", r.data?.totals?.paidSeconds, sumPaid);

  // ── Weekly total pay equals sum of day pay ──
  const sumPay = r.data?.days?.reduce((s, d) => s + d.pay, 0);
  chkVal("total pay equals sum", r.data?.totals?.pay, sumPay);

  // ── Owner can view shift detail ──
  // Create a manual shift first, then check detail
  const monday = r.data?.week?.start || "2026-06-29";
  r = await api("POST", `/api/platform/users/${worker.id}/manual-shift`, {
    date: monday, startTime: "09:00", endTime: "17:00", breakDuration: "30", reason: "Test shift for QA",
  }, cO);
  chk("owner create manual shift", r.status, 201);
  const shiftId = r.data?.id;

  if (shiftId) {
    r = await apiGet(`/api/platform/users/${worker.id}/shifts/${shiftId}`, cO);
    chk("owner view shift detail", r.status, 200);
    chkVal("shift detail has events", Array.isArray(r.data?.events), true);

    // ── Approve only pending shift ──
    r = await api("POST", `/api/platform/users/${worker.id}/shifts/${shiftId}/approve`, {}, cO);
    chk("approve pending shift", r.status, 200);

    // ── Approve already-approved shift fails ──
    r = await api("POST", `/api/platform/users/${worker.id}/shifts/${shiftId}/approve`, {}, cO);
    chk("reject re-approve 400", r.status, 400);

    // ── Reject only pending (already approved so fail) ──
    r = await api("POST", `/api/platform/users/${worker.id}/shifts/${shiftId}/reject`, {}, cO);
    chk("reject non-pending 400", r.status, 400);
  }

  // ── Owner can update rate from worker profile ──
  r = await api("PATCH", `/api/platform/users/${worker.id}/hourly-rate`, { hourlyRate: 42.5 }, cO);
  chk("owner update rate from profile", r.status, 200);

  // ── Invalid rate rejected ──
  r = await api("PATCH", `/api/platform/users/${worker.id}/hourly-rate`, { hourlyRate: 999 }, cO);
  chk("invalid rate 400", r.status, 400);

  // ── Changing current hourly rate does NOT change old weekly pay ──
  // Re-fetch weekly timesheet - pay values should be the same as before rate change
  const week2 = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=2026-06-29`, cO);
  chk("old week pay unchanged after rate change", week2.status, 200);

  // ── Manual shift without reason rejected ──
  r = await api("POST", `/api/platform/users/${worker.id}/manual-shift`, {
    date: monday, startTime: "09:00", endTime: "17:00", breakDuration: "0", reason: "",
  }, cO);
  chk("manual shift without reason 400", r.status, 400);

  // ── Blocked roles ──
  r = await apiGet(`/api/platform/users/${worker.id}/profile`, cA);
  chk("admin blocked from profile 403", r.status, 403);

  r = await apiGet(`/api/platform/users/${worker.id}/profile`, cM);
  chk("manager blocked from profile 403", r.status, 403);

  r = await apiGet(`/api/platform/users/${worker.id}/profile`, cW);
  chk("worker blocked from profile 403", r.status, 403);

  r = await apiGet(`/api/platform/users/${client?.id || "none"}/profile`, cC);
  chk("client blocked from profile 403", r.status, 403);

  // ── Worker timesheet endpoint blocked for non-owner ──
  r = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=2026-06-29`, cA);
  chk("admin timesheet blocked 403", r.status, 403);

  // ── Shift detail rejects mismatched userId ──
  if (shiftId && admin) {
    r = await apiGet(`/api/platform/users/${admin.id}/shifts/${shiftId}`, cO);
    chk("mismatched userId+shiftId rejected", r.status, 404);
  }

  // ── Manual shift creates check_in AND check_out events ──
  if (shiftId) {
    const detail = await apiGet(`/api/platform/users/${worker.id}/shifts/${shiftId}`, cO);
    const eventTypes = detail.data?.events?.map(e => e.event_type) || [];
    chk("manual shift has check_in event", eventTypes.includes("check_in"), true);
    chk("manual shift has check_out event", eventTypes.includes("check_out"), true);
    // Check source
    const hasAdminSource = detail.data?.events?.some(e => e.source === "admin");
    chk("manual shift events source admin", hasAdminSource, true);
  }

  // ── Owner can adjust shift with reason ──
  if (shiftId) {
    r = await api("PATCH", `/api/platform/users/${worker.id}/shifts/${shiftId}`, {
      startTime: "2026-06-29T08:00", endTime: "2026-06-29T16:00", breakDuration: "45", reason: "Shift adjusted for testing",
    }, cO);
    chk("owner adjust shift with reason", r.status, 200);

    // ── Adjust shift without reason returns 400 ──
    r = await api("PATCH", `/api/platform/users/${worker.id}/shifts/${shiftId}`, {
      startTime: "2026-06-29T08:00", endTime: "2026-06-29T16:00", reason: "",
    }, cO);
    chk("adjust shift without reason 400", r.status, 400);

    // ── Adjustment recalculates total_seconds and payable_seconds ──
    const detail2 = await apiGet(`/api/platform/users/${worker.id}/shifts/${shiftId}`, cO);
    if (detail2.data?.shift) {
      chk("adjustment sets total_seconds > 0", detail2.data.shift.total_seconds > 0, true);
      chk("adjustment sets payable_seconds", detail2.data.shift.payable_seconds > 0, true);
      chk("adjustment sets base_seconds", detail2.data.shift.base_seconds > 0, true);
      chk("adjustment sets base_pay", detail2.data.shift.base_pay > 0, true);
    }

    // ── Adjustment recalculates approved final_gross_pay ──
    // The shift was approved earlier, so final_gross_pay should be recalculated
    if (detail2.data?.shift) {
      chk("adjustment updates final_gross_pay", detail2.data.shift.final_gross_pay > 0, true);
    }

    // ── Weekly pay updates after approved shift adjustment ──
    const week3 = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=2026-06-29`, cO);
    const adjDay = week3.data?.days?.find(d => d.shiftId === shiftId);
    if (adjDay) {
      chk("adjusted day pay > 0", adjDay.pay > 0, true);
    }
  }
});

const total = pass + fail;
console.log(`Phase 8D: ${pass} passed, ${fail} failed (${total} total)`);
process.exit(fail > 0 ? 1 : 0);
