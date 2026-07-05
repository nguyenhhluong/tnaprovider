import { withServer, mustGetCookie, auth } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;

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

const USERS = [
  { email: "owner@test.com", password: "ChangeMe123!", name: "Test Owner", role: "owner" },
  { email: "admin@test.com", password: "AdminPass1!", name: "Test Admin", role: "admin" },
  { email: "mgr@test.com", password: "MgrPass1!", name: "Test Manager", role: "manager" },
  { email: "wkr@test.com", password: "WkrPass1!", name: "Test Worker", role: "worker" },
  { email: "cli@test.com", password: "CliPass1!", name: "Test Client", role: "client", mustChangePassword: false },
];

await withServer({
  dbPath: "data/test-phase8b.db",
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

  // ── Owner can create worker with rate ──
  let r = await api("POST", "/api/platform/users", { email: "new-worker@test.com", name: "New Worker", role: "worker", password: "NewWorker123!", hourlyRate: 35.5, mustChangePassword: true }, cO);
  chk("create worker with rate", r.status, 201);
  const newWorkerId = r.data?.id;
  chk("create worker returns hourlyRate", r.data?.hourlyRate, 35.5);

  // ── Owner can create client without rate ──
  r = await api("POST", "/api/platform/users", { email: "new-client@test.com", name: "New Client", role: "client", password: "NewClient123!", mustChangePassword: true }, cO);
  chk("create client without rate", r.status, 201);
  chk("create client no hourlyRate", r.data?.hourlyRate, null);

  // ── Duplicate email returns 409 ──
  r = await api("POST", "/api/platform/users", { email: "owner@test.com", name: "Dup", role: "worker", password: "DupPass123!", hourlyRate: 30 }, cO);
  chk("duplicate email 409", r.status, 409);

  // ── Invalid rate returns 400 ──
  r = await api("POST", "/api/platform/users", { email: "bad-rate@test.com", name: "Bad Rate", role: "worker", password: "BadRate123!", hourlyRate: 40.555 }, cO);
  chk("invalid rate 400 (3 decimals)", r.status, 400);

  r = await api("POST", "/api/platform/users", { email: "bad-rate2@test.com", name: "Bad Rate2", role: "worker", password: "BadRate123!", hourlyRate: 0 }, cO);
  chk("invalid rate 400 (zero)", r.status, 400);

  r = await api("POST", "/api/platform/users", { email: "bad-rate3@test.com", name: "Bad Rate3", role: "worker", password: "BadRate123!", hourlyRate: 301 }, cO);
  chk("invalid rate 400 (over 300)", r.status, 400);

  // ── Missing rate for worker returns 400 ──
  r = await api("POST", "/api/platform/users", { email: "no-rate@test.com", name: "No Rate", role: "worker", password: "NoRate123!" }, cO);
  chk("missing worker rate 400", r.status, 400);

  // ── Admin cannot direct-create user ──
  r = await api("POST", "/api/platform/users", { email: "admin-create@test.com", name: "Admin Create", role: "worker", password: "AdminCreate1!", hourlyRate: 30 }, cA);
  chk("admin cannot create user 403", r.status, 403);

  // ── Manager cannot create users ──
  r = await api("POST", "/api/platform/users", { email: "mgr-create@test.com", name: "Mgr Create", role: "worker", password: "MgrCreate1!", hourlyRate: 30 }, cM);
  chk("manager cannot create user 403", r.status, 403);

  // ── Worker cannot create users ──
  r = await api("POST", "/api/platform/users", { email: "wkr-create@test.com", name: "Wkr Create", role: "worker", password: "WkrCreate1!", hourlyRate: 30 }, cW);
  chk("worker cannot create user 403", r.status, 403);

  // ── Client cannot create users ──
  r = await api("POST", "/api/platform/users", { email: "cli-create@test.com", name: "Cli Create", role: "worker", password: "CliCreate1!", hourlyRate: 30 }, cC);
  chk("client cannot create user 403", r.status, 403);

  // ── Owner cannot set client rate ──
  const usersList = await apiGet("/api/platform/users", cO);
  const clientUser = usersList.data?.find(u => u.email === "cli@test.com");
  if (clientUser) {
    r = await api("PATCH", `/api/platform/users/${clientUser.id}/hourly-rate`, { hourlyRate: 40 }, cO);
    chk("owner cannot set client rate", r.status, 400);
  }

  // ── Owner can update worker hourly rate (using freshly created worker) ──
  const updUser = usersList.data?.find(u => u.email === "new-worker@test.com");
  if (updUser) {
    r = await api("PATCH", `/api/platform/users/${updUser.id}/hourly-rate`, { hourlyRate: 42.5 }, cO);
    chk("owner update worker rate", r.status, 200);
    chk("rate returns new value", r.data?.hourlyRate, 42.5);

    // ── Rate with 3 decimals rejected ──
    r = await api("PATCH", `/api/platform/users/${updUser.id}/hourly-rate`, { hourlyRate: 42.555 }, cO);
    chk("rate 3 decimals rejected 400", r.status, 400);
  }

  // ── Worker check-in with rate (mustChangePassword must be false for timesheet test) ──
  r = await api("POST", "/api/platform/users", { email: "checkin-wkr@test.com", name: "Checkin Wkr", role: "worker", password: "Checkin123!", hourlyRate: 30, mustChangePassword: false }, cO);
  const checkinWkrId = r.data?.id;
  if (checkinWkrId) {
    const cNW = await mustGetCookie("checkin-wkr@test.com", "Checkin123!", "checkin-wkr");
    r = await api("POST", "/api/realtime-timesheets/check-in", {}, cNW);
    chk("worker with rate can check in", r.status, 201);
    
    // ── Check-in snapshots current rate ──
    const activeShift = await apiGet("/api/realtime-timesheets/active", cNW);
    chk("shift snapshot equals rate", activeShift.data?.shift?.hourlyRateSnapshot, 30);

    // ── Changing user rate does NOT change active shift snapshot ──
    await api("PATCH", `/api/platform/users/${checkinWkrId}/hourly-rate`, { hourlyRate: 50 }, cO);
    const activeShift2 = await apiGet("/api/realtime-timesheets/active", cNW);
    chk("snapshot unchanged after rate change", activeShift2.data?.shift?.hourlyRateSnapshot, 30);

    // ── Checkout while on_break ──
    const shiftId = activeShift.data?.shift?.id;
    await api("POST", `/api/realtime-timesheets/${shiftId}/break/start`, {}, cNW);
    await new Promise(r => setTimeout(r, 200));
    r = await api("POST", `/api/realtime-timesheets/${shiftId}/check-out`, {}, cNW);
    chk("checkout while on break", r.status, 200);

    // ── Approve only pending_approval ──
    const pendingList = await apiGet("/api/realtime-timesheets/admin/pending", cO);
    const pendingShift = pendingList.data?.find(s => s.id === shiftId);
    if (pendingShift) {
      r = await api("POST", `/api/realtime-timesheets/admin/${shiftId}/approve`, {}, cO);
      chk("approve pending shift", r.status, 200);

      // ── Approve already-approved shift fails ──
      r = await api("POST", `/api/realtime-timesheets/admin/${shiftId}/approve`, {}, cO);
      chk("reject re-approve 400", r.status, 400);

      // ── Reject already-approved shift fails ──
      r = await api("POST", `/api/realtime-timesheets/admin/${shiftId}/reject`, {}, cO);
      chk("reject non-pending 400", r.status, 400);
    }

    // ── Approval uses hourly_rate_snapshot, not current user rate ──
    const shiftDetail = await apiGet(`/api/realtime-timesheets/admin/${shiftId}`, cO);
    if (shiftDetail.data?.shift) {
      chk("approval snapshot preserved", shiftDetail.data.shift.hourly_rate_snapshot, 30);
    }
  }

  // ── Worker active and admin active consistency ──
  // Login as the original worker who has a rate
  const cW2 = await mustGetCookie("wkr@test.com", "WkrPass1!", "worker2");
  r = await api("POST", "/api/realtime-timesheets/check-in", {}, cW2);
  if (r.status === 201 || r.data?.active) {
    const workerActive = await apiGet("/api/realtime-timesheets/active", cW2);
    const adminActive = await apiGet("/api/realtime-timesheets/admin/active", cO);
    if (workerActive.data?.active && adminActive.data?.length > 0) {
      const adminShift = adminActive.data.find(s => s.employee_id === r.data?.shift?.employee_id || s.employee_id === cW2.userId);
      if (adminShift && workerActive.data?.shift) {
        chk("admin active has live fields", adminShift.liveTotalSeconds !== undefined, true);
        chk("admin active has liveEstimatedGrossPay", adminShift.liveEstimatedGrossPay !== undefined, true);
        chk("admin active has employeeName", adminShift.employeeName !== undefined, true);
      }
    }
  }
});

const total = pass + fail;
console.log(`Phase 8B: ${pass} passed, ${fail} failed (${total} total)`);
process.exit(fail > 0 ? 1 : 0);
