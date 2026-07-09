import { withServer, mustGetCookie, getCookie } from "./test-harness.mjs";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
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

function chk(label, condition, expected, actual) {
  if (condition) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`); }
}

async function getSiteQrToken(cookie) {
  const res = await fetch(`${BASE}/api/realtime-timesheets/sites/admin`, { headers: { Cookie: cookie } });
  const sites = await res.json();
  if (!sites || sites.length === 0) throw new Error("No sites seeded");
  return sites[0].qr_token;
}

// ── PWA file checks ──────────────────────────────────────────
function checkPWAFiles() {
  const manifestPath = resolve(ROOT, "public/manifest.webmanifest");
  chk("PWA manifest exists", existsSync(manifestPath), true, existsSync(manifestPath));

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  chk("Manifest has name", !!manifest.name, true, !!manifest.name);
  chk("Manifest display standalone", manifest.display === "standalone", "standalone", manifest.display);
  chk("Manifest has icons", Array.isArray(manifest.icons) && manifest.icons.length > 0, true, manifest.icons?.length);

  const swPath = resolve(ROOT, "public/sw.js");
  chk("sw.js exists", existsSync(swPath), true, existsSync(swPath));
  const sw = readFileSync(swPath, "utf-8");
  chk("sw.js has install event", sw.includes("install"), true, sw.includes("install"));
  chk("sw.js has network-first for API", sw.includes("network-first") || sw.includes("networkFirst"), true, sw.includes("networkFirst"));
  chk("sw.js has offline fallback", sw.includes("offline.html"), true, sw.includes("offline.html"));

  const offlinePath = resolve(ROOT, "public/offline.html");
  chk("offline.html exists", existsSync(offlinePath), true, existsSync(offlinePath));

  const icon192 = resolve(ROOT, "public/icons/icon-192.svg");
  const icon512 = resolve(ROOT, "public/icons/icon-512.svg");
  chk("icon-192.svg exists", existsSync(icon192), true, existsSync(icon192));
  chk("icon-512.svg exists", existsSync(icon512), true, existsSync(icon512));

  const indexPath = resolve(ROOT, "index.html");
  const indexHtml = readFileSync(indexPath, "utf-8");
  chk("index.html links manifest", indexHtml.includes("manifest.webmanifest"), true, indexHtml.includes("manifest.webmanifest"));
  chk("index.html registers SW", indexHtml.includes("serviceWorker.register"), true, indexHtml.includes("serviceWorker.register"));
}

// ── Backend idempotency tests ─────────────────────────────────
async function testIdempotency(cO, cW) {
  const qrToken = await getSiteQrToken(cO);

  // 1. Normal online check-in
  const r1 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cW);
  chk("Online check-in returns 201", r1.status === 201, 201, r1.status);
  chk("Online check-in success", r1.data?.success === true, true, r1.data?.success);
  chk("Online check-in source qr", r1.data?.synced === undefined || r1.data?.synced === false, false, r1.data?.synced);

  // Check shift_events has 'qr' source
  const shiftId = r1.data?.shift?.id;
  if (shiftId) {
    const db = await getDb();
    const event = db.prepare("SELECT source FROM shift_events WHERE shift_session_id = ? AND event_type = 'check_in'").get(shiftId);
    chk("Event source is 'qr' for online action", event?.source === "qr", "qr", event?.source);
    db.close();
  }

  // 2. Check-out
  const r2 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out" }, cW);
  chk("Online check-out success", r2.data?.success === true, true, r2.data?.success);

  // 3. Offline check-in with idempotencyKey
  const idKey1 = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const r3 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey1,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Offline check-in with idempotencyKey returns 201", r3.status === 201, 201, r3.status);
  chk("Offline check-in synced flag", r3.data?.synced === true, true, r3.data?.synced);
  chk("Offline check-in not duplicate", r3.data?.duplicate === false, false, r3.data?.duplicate);

  // Check event source is 'offline_qr'
  const shiftId2 = r3.data?.shift?.id;
  if (shiftId2) {
    const db = await getDb();
    const event2 = db.prepare("SELECT source FROM shift_events WHERE shift_session_id = ? AND event_type = 'check_in'").get(shiftId2);
    chk("Event source is 'offline_qr' for offline action", event2?.source === "offline_qr", "offline_qr", event2?.source);
    db.close();
  }

  // Check receipt was stored
  const db = await getDb();
  const receipt = db.prepare("SELECT * FROM offline_action_receipts WHERE idempotency_key = ?").get(idKey1);
  chk("Receipt stored for idempotent action", !!receipt, true, !!receipt);
  if (receipt) {
    chk("Receipt action is check_in", receipt.action === "check_in", "check_in", receipt.action);
    chk("Receipt result is accepted", receipt.result_status === "accepted", "accepted", receipt.result_status);
  }
  db.close();

  // 4. Duplicate idempotencyKey — should not create duplicate shift
  const r4 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey1,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Duplicate idempotencyKey returns 200", r4.status === 200, 200, r4.status);
  chk("Duplicate returns success", r4.data?.success === true, true, r4.data?.success);
  chk("Duplicate marked as duplicate", r4.data?.duplicate === true, true, r4.data?.duplicate);
  chk("Duplicate marked as synced", r4.data?.synced === true, true, r4.data?.synced);

  // Check only one shift session for this action
  const db2 = await getDb();
  const receipts = db2.prepare("SELECT * FROM offline_action_receipts WHERE idempotency_key = ?").all(idKey1);
  chk("Only one receipt stored for idempotencyKey", receipts.length === 1, 1, receipts.length);
  db2.close();

  // 5. Stale action rejection (>24 hours old)
  const staleKey = crypto.randomUUID?.() || `${Date.now()}-stale`;
  const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const r5 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_out",
    idempotencyKey: staleKey,
    clientCreatedAt: staleTime,
  }, cW);
  chk("Stale action returns 400", r5.status === 400, 400, r5.status);
  chk("Stale action error message", r5.data?.error?.includes("too old"), true, r5.data?.error);

  // 6. Offline check-out with idempotencyKey
  const idKey2 = crypto.randomUUID?.() || `${Date.now()}-co`;
  const r6 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_out",
    idempotencyKey: idKey2,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Offline check-out with idempotencyKey returns 200", r6.status === 200, 200, r6.status);
  chk("Offline check-out synced", r6.data?.synced === true, true, r6.data?.synced);

  // 7. Offline break actions with idempotencyKey
  const idKey3 = crypto.randomUUID?.() || `${Date.now()}-co2`;
  const r7 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey3,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Offline check-in for break test", r7.status === 201, 201, r7.status);
  const breakShiftId = r7.data?.shift?.id;

  const idKey4 = crypto.randomUUID?.() || `${Date.now()}-bs`;
  const r8 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "start_break",
    idempotencyKey: idKey4,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Offline start_break returns 200", r8.status === 200, 200, r8.status);
  chk("Offline start_break synced", r8.data?.synced === true, true, r8.data?.synced);

  const idKey5 = crypto.randomUUID?.() || `${Date.now()}-be`;
  const r9 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "end_break",
    idempotencyKey: idKey5,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Offline end_break returns 200", r9.status === 200, 200, r9.status);
  chk("Offline end_break synced", r9.data?.synced === true, true, r9.data?.synced);

  // Check break events have offline_qr source
  const db3 = await getDb();
  if (breakShiftId) {
    const breakEvents = db3.prepare("SELECT event_type, source FROM shift_events WHERE shift_session_id = ? AND event_type IN ('break_start','break_end') ORDER BY event_time").all(breakShiftId);
    chk("Break events exist", breakEvents.length >= 2, true, breakEvents.length >= 2);
    if (breakEvents.length >= 2) {
      chk("Break start source offline_qr", breakEvents[0].source === "offline_qr", "offline_qr", breakEvents[0].source);
      chk("Break end source offline_qr", breakEvents[1].source === "offline_qr", "offline_qr", breakEvents[1].source);
    }
  }
  db3.close();
}

function getDb() {
  const dbPath = resolve(ROOT, "data/test-phase8f.db");
  const db = new Database(dbPath);
  return db;
}

// ── Main ─────────────────────────────────────────────────────
console.log("=== Phase 8F: Offline / PWA Worker Mode ===");

// PWA file checks (no server needed)
checkPWAFiles();

const USERS = [
  { email: "offline-wkr@test.com", password: "Pass1234!", name: "Offline Worker", role: "worker", mustChangePassword: false },
];

await withServer({
  dbPath: "data/test-phase8f.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "Test Owner",
  },
  setupUsers: USERS,
}, async () => {
  const cO = await mustGetCookie("owner@test.com", "ChangeMe123!", "owner");
  const cW = await mustGetCookie("offline-wkr@test.com", "Pass1234!", "worker");

  await testIdempotency(cO, cW);
});

console.log(`\nPhase 8F: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
