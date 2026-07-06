import { withServer, mustGetCookie } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

function chk(label, actual, expected) {
  if (actual === expected) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`); }
}

function chkVal(label, actual, expected) {
  if (actual === expected) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`); }
}

function chkGt(label, actual, threshold) {
  if (actual > threshold) pass++;
  else { fail++; console.error(`FAIL ${label}: expected > ${threshold} got ${actual}`); }
}

function chkArr(label, arr, len) {
  if (Array.isArray(arr) && arr.length >= len) pass++;
  else { fail++; console.error(`FAIL ${label}: expected array length >= ${len} got ${arr?.length}`); }
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

const USERS = [
  { email: "owner@test.com", password: "ChangeMe123!", name: "Test Owner", role: "owner" },
  { email: "admin@test.com", password: "AdminPass1!", name: "Test Admin", role: "admin" },
  { email: "wkr@test.com", password: "WkrPass1!", name: "Test Worker", role: "worker", mustChangePassword: false, hourlyRate: 42 },
  { email: "cli@test.com", password: "CliPass1!", name: "Test Client", role: "client" },
];

await withServer({
  dbPath: "data/test-phase8e.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "Test Owner",
  },
  setupUsers: USERS.slice(1),
}, async () => {
  const cO = await mustGetCookie("owner@test.com", "ChangeMe123!", "owner");
  const cA = await mustGetCookie("admin@test.com", "AdminPass1!", "admin");
  const cW = await mustGetCookie("wkr@test.com", "WkrPass1!", "worker");
  const cC = await mustGetCookie("cli@test.com", "CliPass1!", "client");

  const usersList = await apiGet("/api/platform/users", cO);
  const worker = usersList.data?.find(u => u.email === "wkr@test.com");
  const admin = usersList.data?.find(u => u.email === "admin@test.com");
  const client = usersList.data?.find(u => u.email === "cli@test.com");

  if (!worker || !admin || !client) { console.error("Required test users not found"); process.exit(1); }

  // ── 1. Owner can fetch worker timesheet week history ──
  let r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cO);
  chk("owner fetch timesheet-weeks 200", r.status, 200);
  chkArr("timesheet-weeks returns array", r.data?.weeks, 1);

  // ── 2. History returns newest week first ──
  const weeks = r.data?.weeks || [];
  if (weeks.length >= 2) {
    for (let i = 1; i < weeks.length; i++) {
      if (weeks[i - 1].weekStart >= weeks[i].weekStart) pass++;
      else { fail++; console.error(`FAIL history not sorted newest first at index ${i}`); }
    }
  } else {
    // Only current week exists (no shifts yet) — still valid
    pass++;
  }

  // ── 3. History row includes totalSeconds ──
  chk("history row has totalSeconds", typeof weeks[0]?.totalSeconds, "number");

  // ── 4. History row includes totalPay ──
  chk("history row has totalPay", typeof weeks[0]?.totalPay, "number");

  // ── 5. History row includes shift counts ──
  chk("history row has shiftCount", typeof weeks[0]?.shiftCount, "number");
  chk("history row has approvedCount", typeof weeks[0]?.approvedCount, "number");
  chk("history row has pendingCount", typeof weeks[0]?.pendingCount, "number");
  chk("history row has rejectedCount", typeof weeks[0]?.rejectedCount, "number");

  // ── 6. History row includes missingCount ──
  chk("history row has missingCount", typeof weeks[0]?.missingCount, "number");

  // ── 7. Current week shows 7 missing when no shifts exist ──
  chk("current week 7 missing with no shifts", weeks[0]?.missingCount, 7);

  // ── 8. worker/client cannot fetch another worker history ──
  r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cW);
  chk("worker blocked from timesheet-weeks 403", r.status, 403);

  r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cC);
  chk("client blocked from timesheet-weeks 403", r.status, 403);

  r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cA);
  chk("admin blocked from timesheet-weeks 403", r.status, 403);

  // ── 9. Create manual shifts and verify history updates ──
  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDay = now.getDay();
  // Get this Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (todayDay === 0 ? 6 : todayDay - 1));
  const mondayStr = thisMonday.toISOString().split("T")[0];

  // Create a shift on Monday
  r = await api("POST", `/api/platform/users/${worker.id}/manual-shift`, {
    date: mondayStr, startTime: "09:00", endTime: "17:00", breakDuration: "30", reason: "Phase 8E test shift",
  }, cO);
  chk("create manual shift for history test", r.status, 201);
  const shiftId = r.data?.id;

  // ── 10. History reflects the new shift ──
  r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cO);
  chk("history shows shift after creation", r.status, 200);
  const currentWeek = r.data?.weeks?.[0];
  chkGt("current week totalSeconds > 0 after shift", currentWeek?.totalSeconds || 0, 0);
  chk("shift count is 1 after creation", currentWeek?.shiftCount, 1);
  chk("pending count is 1 after creation", currentWeek?.pendingCount, 1);
  chk("approved count is 0 before approval", currentWeek?.approvedCount, 0);
  chk("rejected count is 0 before approval", currentWeek?.rejectedCount, 0);
  chk("missing count is 6 (1 day with shift out of 7)", currentWeek?.missingCount, 6);

  // ── 11. History totalPay matches existing Worker Profile calculation ──
  const weekData = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=${mondayStr}`, cO);
  const weekPay = weekData.data?.totals?.pay || 0;
  chk("history pay matches timesheet-week pay", currentWeek?.totalPay, weekPay);

  // ── 12. Approve shift and verify history ──
  if (shiftId) {
    r = await api("POST", `/api/platform/users/${worker.id}/shifts/${shiftId}/approve`, {}, cO);
    chk("approve shift for history test", r.status, 200);

    r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cO);
    const approvedWeek = r.data?.weeks?.[0];
    chk("approved count is 1 after approval", approvedWeek?.approvedCount, 1);
    chk("pending count is 0 after approval", approvedWeek?.pendingCount, 0);

    // ── 13. Adjustment recalculates and history reflects it ──
    r = await api("PATCH", `/api/platform/users/${worker.id}/shifts/${shiftId}`, {
      startTime: `${mondayStr}T08:00`, endTime: `${mondayStr}T16:00`, breakDuration: "45", reason: "Adjustment test for Phase 8E",
    }, cO);
    chk("adjust shift for history test", r.status, 200);

    r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cO);
    const adjustedWeek = r.data?.weeks?.[0];
    chkGt("history shows adjusted pay", adjustedWeek?.totalPay || 0, 0);

    // ── 14. Left/right week arrows still work (fetch next/prev weeks) ──
    // Get previous week
    const prevMonday = new Date(thisMonday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevMondayStr = prevMonday.toISOString().split("T")[0];
    r = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=${prevMondayStr}`, cO);
    chk("previous week fetch works", r.status, 200);

    // ── 15. Manual shift still works after selecting old week ──
    r = await api("POST", `/api/platform/users/${worker.id}/manual-shift`, {
      date: prevMondayStr, startTime: "10:00", endTime: "15:00", breakDuration: "0", reason: "Old week shift for Phase 8E",
    }, cO);
    chk("manual shift in old week works", r.status, 201);
  }

  // ── 16. No duplicate pay calculation path (verify with existing week endpoint) ──
  const weekDataCompare = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=${mondayStr}`, cO);
  const historyData = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`, cO);
  const historyWeek = historyData.data?.weeks?.[0];
  if (weekDataCompare.data?.totals && historyWeek) {
    chk("history totalSeconds matches week totalSeconds", historyWeek.totalSeconds, weekDataCompare.data.totals.paidSeconds);
    chk("history totalPay matches week totalPay", historyWeek.totalPay, weekDataCompare.data.totals.pay);
  }

  // ── 17. No secrets exposed in response ──
  const historyRes = await fetch(`${BASE}/api/platform/users/${worker.id}/timesheet-weeks`, {
    headers: { Cookie: cO },
  });
  const historyBody = await historyRes.text();
  chk("no password in response", historyBody.includes("password"), false);
  chk("no password_hash in response", historyBody.includes("password_hash"), false);
  chk("no token in response", historyBody.includes("token"), false);

  // ── 18. Current week start format is correct ──
  const currentWeekStart = weeks[0]?.weekStart;
  chk("weekStart is YYYY-MM-DD format", /^\d{4}-\d{2}-\d{2}$/.test(currentWeekStart || ""), true);
  const currentWeekEnd = weeks[0]?.weekEnd;
  chk("weekEnd is YYYY-MM-DD format", /^\d{4}-\d{2}-\d{2}$/.test(currentWeekEnd || ""), true);

  // ── 19. Empty history weeks have 0 values ──
  // Find a week with no shifts (should be the oldest week in the list if no shifts exist beyond current)
  const emptyWeek = r.data?.weeks?.find((w) => w.shiftCount === 0);
  if (emptyWeek) {
    chk("empty week totalSeconds is 0", emptyWeek.totalSeconds, 0);
    chk("empty week totalPay is 0", emptyWeek.totalPay, 0);
    chk("empty week missingCount is 7", emptyWeek.missingCount, 7);
  }

  // ── 20. Role protection: unauthenticated blocked ──
  r = await apiGet(`/api/platform/users/${worker.id}/timesheet-weeks`);
  chk("unauthenticated blocked from timesheet-weeks 401", r.status, 401);
});

const total = pass + fail;
console.log(`Phase 8E: ${pass} passed, ${fail} failed (${total} total)`);
process.exit(fail > 0 ? 1 : 0);
