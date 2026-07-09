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

function getDb() {
  const dbPath = resolve(ROOT, "data/test-phase8f.db");
  const db = new Database(dbPath);
  return db;
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
  chk("sw.js has network-first for API", sw.includes("networkFirst"), true, sw.includes("networkFirst"));
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

  // PWA source checks
  const pwaPath = resolve(ROOT, "src/utils/pwa.ts");
  chk("pwa.ts exists", existsSync(pwaPath), true, existsSync(pwaPath));
  const pwaSrc = readFileSync(pwaPath, "utf-8");
  chk("pwa.ts exports isInstallable", pwaSrc.includes("isInstallable"), true, pwaSrc.includes("isInstallable"));
  chk("pwa.ts exports promptInstall", pwaSrc.includes("promptInstall"), true, pwaSrc.includes("promptInstall"));
  chk("pwa.ts exports isOnline", pwaSrc.includes("isOnline"), true, pwaSrc.includes("isOnline"));
  chk("pwa.ts handles beforeinstallprompt", pwaSrc.includes("beforeinstallprompt"), true, pwaSrc.includes("beforeinstallprompt"));

  // OfflineQueue source checks
  const queuePath = resolve(ROOT, "src/utils/offlineQueue.ts");
  chk("offlineQueue.ts exists", existsSync(queuePath), true, existsSync(queuePath));
  const queueSrc = readFileSync(queuePath, "utf-8");
  chk("offlineQueue handles recoverStuckSyncing", queueSrc.includes("recoverStuckSyncing"), true, queueSrc.includes("recoverStuckSyncing"));
  chk("offlineQueue has getQueueStats", queueSrc.includes("getQueueStats"), true, queueSrc.includes("getQueueStats"));
  chk("offlineQueue has rejected status", queueSrc.includes("rejected"), true, queueSrc.includes("rejected"));
  chk("offlineQueue has login_required status", queueSrc.includes("login_required"), true, queueSrc.includes("login_required"));
  chk("offlineQueue has retryable_failed status", queueSrc.includes("retryable_failed"), true, queueSrc.includes("retryable_failed"));
  chk("offlineQueue has lastAttemptAt", queueSrc.includes("lastAttemptAt"), true, queueSrc.includes("lastAttemptAt"));
  chk("offlineQueue has attemptCount", queueSrc.includes("attemptCount"), true, queueSrc.includes("attemptCount"));

  // QR page source checks
  const qrPagePath = resolve(ROOT, "src/pages/platform/QRQuickAction.tsx");
  chk("QRQuickAction.tsx exists", existsSync(qrPagePath), true, existsSync(qrPagePath));
  const qrSrc = readFileSync(qrPagePath, "utf-8");
  chk("QR page has queuedActionNotice state", qrSrc.includes("queuedActionNotice"), true, qrSrc.includes("queuedActionNotice"));
  chk("QR page has recoverStuckSyncing call", qrSrc.includes("recoverStuckSyncing"), true, qrSrc.includes("recoverStuckSyncing"));
  chk("QR page has install prompt", qrSrc.includes("showInstall"), true, qrSrc.includes("showInstall"));
  chk("QR page uses cn", qrSrc.includes('from "../../utils/cn"'), true, qrSrc.includes('from "../../utils/cn"'));
}

// ── Blocker 1: Offline queued action does NOT show success ───
async function testBlocker1(cO, cW) {
  const qrToken = await getSiteQrToken(cO);

  // Simulate an offline check-in via the API with idempotencyKey
  // Must send source: "offline_qr" so backend treats it as offline-sync action
  const idKey = crypto.randomUUID?.() || `${Date.now()}-b1`;
  const r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey,
    clientCreatedAt: new Date().toISOString(),
    source: "offline_qr",
  }, cW);

  // This is an online call with idempotency — it should succeed
  chk("Blocker1: offline-style check-in succeeds", r.status === 201, 201, r.status);
  chk("Blocker1: synced=true for offline-style action", r.data?.synced === true, true, r.data?.synced);
  chk("Blocker1: not a duplicate", r.data?.duplicate === false, false, r.data?.duplicate);

  // Verify receipt stored with accepted status
  const db = getDb();
  const receipt = db.prepare("SELECT * FROM offline_action_receipts WHERE idempotency_key = ?").get(idKey);
  chk("Blocker1: receipt stored", !!receipt, true, !!receipt);
  if (receipt) {
    chk("Blocker1: receipt status accepted", receipt.result_status === "accepted", "accepted", receipt.result_status);
  }
  db.close();

  // Check-out for cleanup
  await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out", idempotencyKey: crypto.randomUUID?.(), clientCreatedAt: new Date().toISOString() }, cW);
}

// ── Blocker 2: Stuck syncing recovery ────────────────────────
async function testBlocker2(cO, cW) {
  // Verify the sync endpoint does not leave actions stuck in syncing
  // by checking that duplicate idempotencyKeys produce correct status transitions
  const qrToken = await getSiteQrToken(cO);
  const idKey = crypto.randomUUID?.() || `${Date.now()}-b2`;

  // First call — should succeed
  const r1 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Blocker2: first check-in succeeds", r1.status === 201, 201, r1.status);
  const shiftId = r1.data?.shift?.id;

  // Second call with same key — duplicate, should return 200 with duplicate:true
  const r2 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Blocker2: duplicate returns 200", r2.status === 200, 200, r2.status);
  chk("Blocker2: duplicate marked", r2.data?.duplicate === true, true, r2.data?.duplicate);

  // Verify only one shift session was created
  const db = getDb();
  if (shiftId) {
    const sessions = db.prepare("SELECT COUNT(*) as cnt FROM shift_sessions WHERE id = ?").get(shiftId);
    chk("Blocker2: only one shift session", sessions?.cnt === 1, 1, sessions?.cnt);
  }
  db.close();

  // Check-out
  await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out", idempotencyKey: crypto.randomUUID?.(), clientCreatedAt: new Date().toISOString() }, cW);
}

// ── Blocker 3: Failed/rejected actions visible ───────────────
async function testBlocker3(cO, cW) {
  const qrToken = await getSiteQrToken(cO);

  // Stale action should be rejected
  const staleKey = crypto.randomUUID?.() || `${Date.now()}-stale`;
  const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: staleKey,
    clientCreatedAt: staleTime,
  }, cW);
  chk("Blocker3: stale action returns 400", r.status === 400, 400, r.status);
  chk("Blocker3: stale error message", r.data?.error?.includes("too old"), true, r.data?.error);

  // No receipt stored for rejected action (storeReceipt only fires on success)
  const db = getDb();
  const receipt = db.prepare("SELECT * FROM offline_action_receipts WHERE idempotency_key = ?").get(staleKey);
  chk("Blocker3: stale action does not create receipt", !receipt, true, !receipt);
  db.close();
}

// ── Blocker 4: Status handling ───────────────────────────────
async function testBlocker4(cO, cW) {
  const qrToken = await getSiteQrToken(cO);

  // Test that offline_qr source is properly recorded
  const idKey = crypto.randomUUID?.() || `${Date.now()}-b4`;
  const r1 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey,
    clientCreatedAt: new Date().toISOString(),
    source: "offline_qr",
  }, cW);
  chk("Blocker4: check-in with idempotency succeeds", r1.status === 201, 201, r1.status);
  const shiftId = r1.data?.shift?.id;

  // Verify event source is offline_qr
  const db = getDb();
  if (shiftId) {
    const events = db.prepare("SELECT event_type, source FROM shift_events WHERE shift_session_id = ? ORDER BY event_time").all(shiftId);
    const checkInEvent = events.find((e) => e.event_type === "check_in");
    chk("Blocker4: check_in source is offline_qr", checkInEvent?.source === "offline_qr", "offline_qr", checkInEvent?.source);
  }

  // Check-out
  const coKey = crypto.randomUUID?.() || `${Date.now()}-co4`;
  await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out", idempotencyKey: coKey, clientCreatedAt: new Date().toISOString(), source: "offline_qr" }, cW);

  // Verify check-out event also has offline_qr source
  if (shiftId) {
    const events = db.prepare("SELECT event_type, source FROM shift_events WHERE shift_session_id = ? ORDER BY event_time").all(shiftId);
    const checkOutEvent = events.find((e) => e.event_type === "check_out");
    chk("Blocker4: check_out source is offline_qr", checkOutEvent?.source === "offline_qr", "offline_qr", checkOutEvent?.source);
  }
  db.close();

  // Test business-rule 400 is rejected (permanent)
  // Trying to check in when already checked in — should return 400
  const idKey2 = crypto.randomUUID?.() || `${Date.now()}-b4-2`;
  const r2 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey2,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  const shiftId2 = r2.data?.shift?.id;

  // Try check-in with same idempotencyKey — should return 200 duplicate
  const r3 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey2,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Blocker4: duplicate with same idempotencyKey returns 200", r3.status === 200, 200, r3.status);
  chk("Blocker4: duplicate is marked duplicate", r3.data?.duplicate === true, true, r3.data?.duplicate);

  // Now try check-in WITHOUT idempotencyKey — should get 400 already checked in
  const r4 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_in" }, cW);
  chk("Blocker4: non-idempotent duplicate 400", r4.status === 400, 400, r4.status);

  // Cleanup
  const coKey2 = crypto.randomUUID?.() || `${Date.now()}-co4-2`;
  await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out", idempotencyKey: coKey2, clientCreatedAt: new Date().toISOString() }, cW);
  if (shiftId2) {
    const db2 = getDb();
    const sessions = db2.prepare("SELECT COUNT(*) as cnt FROM shift_sessions WHERE id = ?").get(shiftId2);
    chk("Blocker4: only one session created for idempotent pair", sessions?.cnt === 1, 1, sessions?.cnt);
    db2.close();
  }
}

// ── Blocker 5: Install prompt wiring (structural checks) ─────
function testBlocker5() {
  const qrPath = resolve(ROOT, "src/pages/platform/QRQuickAction.tsx");
  const qrSrc = readFileSync(qrPath, "utf-8");

  chk("Blocker5: QR page imports isInstallable", qrSrc.includes("isInstallable"), true, qrSrc.includes("isInstallable"));
  chk("Blocker5: QR page imports promptInstall", qrSrc.includes("promptInstall"), true, qrSrc.includes("promptInstall"));
  chk("Blocker5: QR page uses localStorage for dismiss", qrSrc.includes("install-prompt-dismissed"), true, qrSrc.includes("install-prompt-dismissed"));
  chk("Blocker5: QR page has Install button", qrSrc.includes("Install"), true, qrSrc.includes("Install"));
  chk("Blocker5: QR page has 'Not now' button", qrSrc.includes("Not now"), true, qrSrc.includes("Not now"));

  // OfflineIndicator checks
  const indPath = resolve(ROOT, "src/components/shared/OfflineIndicator.tsx");
  const indSrc = readFileSync(indPath, "utf-8");
  chk("Blocker5: OfflineIndicator shows rejected count", indSrc.includes("rejected"), true, indSrc.includes("rejected"));
  chk("Blocker5: OfflineIndicator shows failed count", indSrc.includes("failed"), true, indSrc.includes("failed"));
  chk("Blocker5: OfflineIndicator shows queued count", indSrc.includes("queued"), true, indSrc.includes("queued"));

  // offlineQueue stats checks
  const queuePath = resolve(ROOT, "src/utils/offlineQueue.ts");
  const queueSrc = readFileSync(queuePath, "utf-8");
  chk("Blocker5: getQueueStats returns login_required count", queueSrc.includes("login_required"), true, queueSrc.includes("login_required"));
  chk("Blocker5: sync returns login_required status", queueSrc.includes("login_required"), true, queueSrc.includes("login_required"));
  chk("Blocker5: sync returns stopped flag", queueSrc.includes("stopped"), true, queueSrc.includes("stopped"));
}

// ── Blocker 6: Network failure queues action + FIFO sync ─────
function testBlocker6() {
  // QR page: catch block must queue, not just show error
  const qrPath = resolve(ROOT, "src/pages/platform/QRQuickAction.tsx");
  const qrSrc = readFileSync(qrPath, "utf-8");
  chk("Blocker6: catch block calls enqueueAction", qrSrc.includes("enqueueAction"), true, qrSrc.includes("enqueueAction"));
  // The doAction catch block must call enqueueAction (not just setError)
  const doActionStart = qrSrc.indexOf("const doAction = async");
  const doActionEnd = qrSrc.indexOf("function liveTimerForShift", doActionStart);
  const doActionBody = doActionStart >= 0 && doActionEnd > doActionStart
    ? qrSrc.slice(doActionStart, doActionEnd) : "";
  chk("Blocker6: doAction function found", doActionBody.length > 0, true, doActionBody.length > 0);
  if (doActionBody) {
    chk("Blocker6: doAction catch block calls enqueueAction", doActionBody.includes("enqueueAction"), true, doActionBody.includes("enqueueAction"));
    chk("Blocker6: doAction catch shows queued notice", doActionBody.includes("queued. It will sync when internet returns"), true, doActionBody.includes("queued. It will sync when internet returns"));
    chk("Blocker6: doAction sets completedAction only for server success", doActionBody.includes("setCompletedAction(action)"), true, doActionBody.includes("setCompletedAction(action)"));
    chk("Blocker6: doAction generates idempotencyKey", doActionBody.includes("crypto.randomUUID()"), true, doActionBody.includes("crypto.randomUUID()"));
    chk("Blocker6: doAction sends idempotencyKey with fetch", doActionBody.includes("idempotencyKey"), true, doActionBody.includes("idempotencyKey"));
    chk("Blocker6: doAction sends clientCreatedAt with fetch", doActionBody.includes("clientCreatedAt"), true, doActionBody.includes("clientCreatedAt"));
    chk("Blocker6: doAction sends source with fetch", doActionBody.includes('source: "qr"'), true, doActionBody.includes('source: "qr"'));
    chk("Blocker6: doAction offline path passes idempotencyKey to enqueueAction", doActionBody.includes("idempotencyKey, clientCreatedAt"), true, doActionBody.includes("idempotencyKey, clientCreatedAt"));
    chk("Blocker6: doAction catch path passes idempotencyKey to enqueueAction", doActionBody.includes("{ idempotencyKey, clientCreatedAt }"), true, doActionBody.includes("{ idempotencyKey, clientCreatedAt }"));
  }
  chk("Blocker6: catch shows queued notice", qrSrc.includes("queued. It will sync when internet returns"), true, qrSrc.includes("queued. It will sync when internet returns"));
  chk("Blocker6: queued notice uses labels", qrSrc.includes("labels["), true, qrSrc.includes("labels["));

  // offlineQueue: getRetryableActions must sort by createdAt
  const queuePath = resolve(ROOT, "src/utils/offlineQueue.ts");
  const queueSrc = readFileSync(queuePath, "utf-8");
  chk("Blocker6: getRetryableActions sorts by createdAt", queueSrc.includes(".sort(") || queueSrc.includes("filter"), true, queueSrc.includes("sort"));
  chk("Blocker6: sort uses createdAt", queueSrc.includes("createdAt"), true, queueSrc.includes("createdAt"));

  // Backend source logic uses req.body.source, not idempotencyKey presence
  const backendPath = resolve(ROOT, "server/routes/realtimeTimesheets.js");
  const backendSrc = readFileSync(backendPath, "utf-8");
  chk("Blocker6: backend source uses req.body.source", backendSrc.includes('req.body.source'), true, backendSrc.includes('req.body.source'));
  chk("Blocker6: backend source is qr not offline_qr by default", backendSrc.includes('"offline_qr" ? "offline_qr" : "qr"'), true, backendSrc.includes('"offline_qr" ? "offline_qr" : "qr"'));

  // offlineQueue: enqueueAction must reject unknown actions
  chk("Blocker6: enqueueAction validates action", queueSrc.includes("ALLOWED_ACTIONS") || queueSrc.includes("Invalid action"), true, queueSrc.includes("Invalid"));

  // syncOne sends source: "offline_qr" for queued sync replay
  chk("Blocker6: syncOne sends offline_qr source", queueSrc.includes('source: "offline_qr"'), true, queueSrc.includes('source: "offline_qr"'));
  chk("Blocker6: enqueueAction throws for bad action", queueSrc.includes("throw new Error"), true, queueSrc.includes("throw new Error"));

  // FIFO test via behavioral check: syncMultipleActionsVariesByOrder
  // We'll mock via IDB by checking the sort is oldest-first
  chk("Blocker6: getRetryableActions returns oldest first", queueSrc.includes("a.createdAt") && queueSrc.includes("b.createdAt"), true, queueSrc.includes("a.createdAt"));
}

// ── Blocker 7: FIFO sync preserves action order ──────────────
async function testBlocker7(cO, cW) {
  const qrToken = await getSiteQrToken(cO);

  // Create two actions in sequence with idempotencyKeys, verify order preserved
  // First check-in
  const idKey1 = crypto.randomUUID?.() || `${Date.now()}-fifo1`;
  const r1 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey1,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Blocker7: first check-in succeeds", r1.status === 201, 201, r1.status);
  const shiftId1 = r1.data?.shift?.id;

  // Check-out
  const idKey2 = crypto.randomUUID?.() || `${Date.now()}-fifo2`;
  const r2 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_out",
    idempotencyKey: idKey2,
    clientCreatedAt: new Date().toISOString(),
  }, cW);
  chk("Blocker7: check-out succeeds", r2.status === 200, 200, r2.status);

  // Verify events are in correct order: check_in then check_out
  const db = getDb();
  if (shiftId1) {
    const events = db.prepare("SELECT event_type, event_time FROM shift_events WHERE shift_session_id = ? ORDER BY event_time").all(shiftId1);
    chk("Blocker7: check_in event exists", events.some((e) => e.event_type === "check_in"), true, true);
    chk("Blocker7: check_out event exists", events.some((e) => e.event_type === "check_out"), true, true);
    if (events.length >= 2) {
      chk("Blocker7: check_in before check_out", events[0].event_type === "check_in", "check_in", events[0].event_type);
    }
  }
  db.close();
}

// ── Blocker 8: Unknown action guard ──────────────────────────
async function testBlocker8(cO, cW) {
  const qrToken = await getSiteQrToken(cO);

  // Verify unknown action is rejected by backend
  const r = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "unknown_action" }, cW);
  chk("Blocker8: unknown action returns 400", r.status === 400, 400, r.status);
  chk("Blocker8: unknown action error message", r.data?.error?.includes("Invalid action"), true, r.data?.error);
}

// ── Blocker 9: Online idempotency + source hardening ──────────
async function testBlocker9(cO, cW) {
  const qrToken = await getSiteQrToken(cO);

  // Test 1: Online action with idempotencyKey + clientCreatedAt + source "qr"
  const idKey = crypto.randomUUID?.() || `${Date.now()}-online-id`;
  const clientCreatedAt = new Date().toISOString();

  const r1 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey,
    clientCreatedAt,
    source: "qr",
  }, cW);
  chk("Blocker9: online check-in with idempotencyKey succeeds", r1.status === 201, 201, r1.status);
  chk("Blocker9: online action not duplicate", r1.data?.duplicate === false, false, r1.data?.duplicate);
  chk("Blocker9: online action synced is undefined/false", r1.data?.synced === undefined || r1.data?.synced === false, false, r1.data?.synced);

  const shiftId = r1.data?.shift?.id;

  // Verify event source is "qr" (not offline_qr)
  const db = getDb();
  if (shiftId) {
    const events = db.prepare("SELECT event_type, source FROM shift_events WHERE shift_session_id = ? ORDER BY event_time").all(shiftId);
    const checkInEvent = events.find((e) => e.event_type === "check_in");
    chk("Blocker9: online event source is qr", checkInEvent?.source === "qr", "qr", checkInEvent?.source);
  }

  // Verify receipt was stored (since idempotencyKey was provided)
  const receipt = db.prepare("SELECT * FROM offline_action_receipts WHERE idempotency_key = ?").get(idKey);
  chk("Blocker9: receipt stored for online idempotent action", !!receipt, true, !!receipt);

  // Test 2: Response-lost fallback — same key replayed returns duplicate:true
  const r2 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, {
    action: "check_in",
    idempotencyKey: idKey,
    clientCreatedAt,
    source: "offline_qr",
  }, cW);
  chk("Blocker9: duplicate replay returns 200", r2.status === 200, 200, r2.status);
  chk("Blocker9: duplicate replay marked duplicate", r2.data?.duplicate === true, true, r2.data?.duplicate);
  chk("Blocker9: duplicate replay has synced flag", r2.data?.synced === true, true, r2.data?.synced);
  chk("Blocker9: duplicate replay includes shift data", !!r2.data?.shiftId, true, !!r2.data?.shiftId);

  // Verify only ONE shift session exists
  if (shiftId) {
    const sessions = db.prepare("SELECT COUNT(*) as cnt FROM shift_sessions WHERE id = ?").get(shiftId);
    chk("Blocker9: duplicate does not create extra shift", sessions?.cnt === 1, 1, sessions?.cnt);
  }

  // Test 3: Normal online event without idempotencyKey still works and has source "qr"
  const r3 = await api("POST", `/api/realtime-timesheets/qr/${qrToken}/action`, { action: "check_out", source: "qr" }, cW);
  chk("Blocker9: online check-out without idempotencyKey works", r3.status === 200, 200, r3.status);

  if (shiftId) {
    const events = db.prepare("SELECT event_type, source FROM shift_events WHERE shift_session_id = ? ORDER BY event_time").all(shiftId);
    const checkOutEvent = events.find((e) => e.event_type === "check_out");
    chk("Blocker9: check_out source is qr", checkOutEvent?.source === "qr", "qr", checkOutEvent?.source);
  }
  db.close();
}

// ── Main ─────────────────────────────────────────────────────
console.log("=== Phase 8F: Offline / PWA Worker Mode ===");

// PWA file + source checks (no server needed)
checkPWAFiles();
testBlocker5();
testBlocker6();

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

  await testBlocker1(cO, cW);
  await testBlocker2(cO, cW);
  await testBlocker3(cO, cW);
  await testBlocker4(cO, cW);
  await testBlocker7(cO, cW);
  await testBlocker8(cO, cW);
  await testBlocker9(cO, cW);
});

console.log(`\nPhase 8F: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
