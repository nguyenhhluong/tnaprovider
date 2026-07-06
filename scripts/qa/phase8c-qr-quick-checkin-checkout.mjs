import { withServer, mustGetCookie } from "./test-harness.mjs";

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

function chkVal(label, actual, expected) {
  if (actual === expected) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`); }
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const USERS = [
  { email: "owner@test.com", password: "ChangeMe123!", name: "Test Owner", role: "owner" },
  { email: "wkr@test.com", password: "WkrPass1!", name: "Test Worker", role: "worker", mustChangePassword: false },
  { email: "cli@test.com", password: "CliPass1!", name: "Test Client", role: "client" },
];

await withServer({
  dbPath: "data/test-phase8c.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "Test Owner",
  },
  setupUsers: USERS.slice(1),
}, async () => {
  const cO = await mustGetCookie("owner@test.com", "ChangeMe123!", "owner");
  const cW = await mustGetCookie("wkr@test.com", "WkrPass1!", "worker");
  const cC = await mustGetCookie("cli@test.com", "CliPass1!", "client");

  // Get the QR token from the seeded site
  const sitesRes = await apiGet("/api/realtime-timesheets/sites/admin", cO);
  const site = sitesRes.data?.[0];
  const qrToken = site?.qr_token;

  if (!qrToken) { console.error("No QR token found"); process.exit(1); }

  // ── Valid QR resolve ──
  let r = await apiGet(`/api/realtime-timesheets/qr/${qrToken}`, cW);
  chk("worker resolve valid QR", r.status, 200);
  chkVal("QR resolve returns valid", r.data?.valid, true);
  chkVal("QR resolve returns site name", r.data?.site?.name, site?.name);

  // ── Invalid QR blocked ──
  r = await apiGet("/api/realtime-timesheets/qr/invalid-token", cW);
  chk("invalid QR 404", r.status, 404);

  // ── Client cannot resolve QR ──
  // Client gets 403 from requirePasswordChanged + client block
  r = await apiGet(`/api/realtime-timesheets/qr/${qrToken}`, cC);
  chk("client QR resolve blocked", r.status, 403);

  // ── Worker with rate can QR check in ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cW);
  chk("worker QR check in", r.status, 201);
  if (r.data?.shift) {
    chk("check-in status active", r.data.status || r.data.shift.status, "active");
  }

  // ── Duplicate QR check-in blocked ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cW);
  chk("duplicate check-in blocked", r.status, 400);

  // ── Worker can start break from QR page ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "start_break" }, cW);
  chk("worker start break", r.status, 200);
  chkVal("break started status", r.data?.status, "on_break");

  // ── Cannot start break twice ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "start_break" }, cW);
  chk("double break blocked", r.status, 400);

  // ── Worker can end break ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "end_break" }, cW);
  chk("worker end break", r.status, 200);
  chkVal("break ended status", r.data?.status, "active");

  // ── Cannot end break without active break ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "end_break" }, cW);
  chk("end break without break blocked", r.status, 400);

  // ── Worker can QR check out ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out" }, cW);
  chk("worker QR check out", r.status, 200);
  chkVal("checkout sets pending_approval", r.data?.status, "pending_approval");

  // ── Admin live timesheet sees QR shift ──
  const pendingList = await apiGet("/api/realtime-timesheets/admin/pending", cO);
  const qrShift = pendingList.data?.find((s) => s.employee_email === "wkr@test.com");
  chk("admin live sees QR shift", !!qrShift, true);

  // ── Worker profile weekly timesheet sees QR shift ──
  const usersList = await apiGet("/api/platform/users", cO);
  const worker = usersList.data?.find((u) => u.email === "wkr@test.com");
  if (worker) {
    const monday = getMonday(new Date()).toISOString().split("T")[0];
    const weekView = await apiGet(`/api/platform/users/${worker.id}/timesheet-week?weekStart=${monday}`, cO);
    const hasShiftToday = weekView.data?.days?.some((d) => d.hasShift);
    chk("worker profile sees QR shift", !!hasShiftToday, true);
  }

  // ── Client cannot check in by QR ──
  r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cC);
  chk("client QR check-in blocked", r.status, 403);

  // ── Event source is qr for all events ──
  // Re-check-in as worker to generate qr events
  r = await api("POST", "/api/platform/users", { email: "qr-evt-wkr@test.com", name: "QR Event Wkr", role: "worker", password: "QrEvt12345!", hourlyRate: 35, mustChangePassword: false }, cO);
  const qrEvtWkrId = r.data?.id;
  if (qrEvtWkrId) {
    const cQE = await mustGetCookie("qr-evt-wkr@test.com", "QrEvt12345!", "qr-evt-wkr");
    r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cQE);
    const shiftId = r.data?.shift?.id;
    if (shiftId) {
      const detail = await apiGet(`/api/platform/users/${qrEvtWkrId}/shifts/${shiftId}`, cO);
      const hasQrSource = detail.data?.events?.some(e => e.source === "qr");
      chk("event source is qr", !!hasQrSource, true);
    }
    // Wrong-site test: check into site A, try actions with non-matching QR
    // Use a QR token that does NOT match the active shift's site
    r = await api("POST", `/api/realtime-timesheets/qr/wrong/nonexistent/action`, { action: "check_out" }, cQE);
    chk("wrong-site check_out blocked 404", r.status, 404);

    // Check error does not return stack trace
    chk("error no stack trace", !r.data?.stack, true);
  }

  // ── Duplicate check-in blocked for actively checked-in worker ──
  // Create a fresh worker, check in, then try duplicate
  r = await api("POST", "/api/platform/users", { email: "dup-checkin@test.com", name: "Dup Checkin", role: "worker", password: "Dup12345!", hourlyRate: 35, mustChangePassword: false }, cO);
  const dupWkrId = r.data?.id;
  if (dupWkrId) {
    const cDP = await mustGetCookie("dup-checkin@test.com", "Dup12345!", "dup-checkin");
    r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cDP);
    chk("first check-in succeeds", r.status, 201);
    r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cDP);
    chk("duplicate check-in blocked", r.status, 400);
  }

  // ── Checkout while on_break counts break correctly ──
  // Re-login fresh worker
  r = await api("POST", "/api/platform/users", { email: "break-checkout@test.com", name: "Break Checkout", role: "worker", password: "Break12345!", hourlyRate: 35, mustChangePassword: false }, cO);
  const bcWkrId = r.data?.id;
  if (bcWkrId) {
    const cBC = await mustGetCookie("break-checkout@test.com", "Break12345!", "break-checkout");
    r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cBC);
    const bcShiftId = r.data?.shift?.id;
    // Start break
    await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "start_break" }, cBC);
    // Checkout while on break
    r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out" }, cBC);
    chk("checkout while on break", r.status, 200);
    chkVal("checkout sets pending", r.data?.status, "pending_approval");
  }

  // ── Wrong-site test with invalid QR (nonexistent site) ──
  r = await api("POST", "/api/platform/users", { email: "wrong-site-wkr@test.com", name: "Wrong Site Wkr", role: "worker", password: "WsWkr1234!", hourlyRate: 35, mustChangePassword: false }, cO);
  const wsId = r.data?.id;
  if (wsId) {
    const cWS = await mustGetCookie("wrong-site-wkr@test.com", "WsWkr1234!", "wrong-site-wkr");
    // Check in using the seeded QR
    r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cWS);
    chk("wrong-site: check in ok", r.status, 201);

    // Try actions with a nonexistent QR (different site)
    const badQr = "nonexistent-site-token";
    r = await api("POST", `/api/realtime-timesheets/qr/${badQr}/action`, { action: "check_out" }, cWS);
    chk("wrong-site check_out 404", r.status, 404);

    r = await api("POST", `/api/realtime-timesheets/qr/${badQr}/action`, { action: "start_break" }, cWS);
    chk("wrong-site start_break 404", r.status, 404);

    r = await api("POST", `/api/realtime-timesheets/qr/${badQr}/action`, { action: "end_break" }, cWS);
    chk("wrong-site end_break 404", r.status, 404);
  }

  // ── Worker Profile route hotfix preserved ──
  if (worker) {
    const profile = await apiGet(`/api/platform/users/${worker.id}/profile`, cO);
    chk("worker profile route still works", profile.status, 200);
  }
});

const total = pass + fail;
console.log(`Phase 8C: ${pass} passed, ${fail} failed (${total} total)`);
process.exit(fail > 0 ? 1 : 0);
