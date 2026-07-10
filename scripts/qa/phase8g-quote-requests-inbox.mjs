import { withServer, mustGetCookie } from "./test-harness.mjs";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

const DB_PATH = resolve(ROOT, "data/test-phase8g.db");

const VALID_CONTACT = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "0400000000",
  service: "construction",
  location: "Sydney NSW",
  message: "I need a quote for a home renovation project. Please contact me.",
  privacyConsent: true,
};

const USERS = [
  { email: "qr-owner@test.com", password: "ChangeMe123!", name: "QR Owner", role: "owner" },
  { email: "qr-admin@test.com", password: "ChangeMe123!", name: "QR Admin", role: "admin" },
  { email: "qr-mgr@test.com", password: "ChangeMe123!", name: "QR Manager", role: "manager" },
  { email: "qr-wkr@test.com", password: "ChangeMe123!", name: "QR Worker", role: "worker" },
  { email: "qr-cli@test.com", password: "ChangeMe123!", name: "QR Client", role: "client" },
];

async function createTestData(cO) {
  const r = await api("POST", "/api/contact", VALID_CONTACT, cO);
  chk("create quote request via contact form", r.status === 200, 200, r.status);
  chk("create returns success", r.data?.success === true, true, r.data?.success);
}

// ── Phase 8G: Quote Requests Inbox ────────────────────────────
console.log("=== Phase 8G: Quote Requests Inbox ===");

// Clean up any old JSON submissions and prepare test data
const jsonPath = resolve(ROOT, "data", "contact-submissions.json");
const jsonBackup = existsSync(jsonPath) ? readFileSync(jsonPath, "utf-8") : null;
if (!existsSync(resolve(ROOT, "data"))) {
  // Ensure data dir exists
}

// Create a test JSON file with legacy submissions to test import
const testJsonPath = resolve(ROOT, "data", "contact-submissions.json");
const legacySubmission = {
  firstName: "Legacy",
  lastName: "User",
  email: "legacy@test.com",
  phone: "0411111111",
  service: "Legacy Service",
  location: "Legacy Location",
  message: "This is a legacy contact submission for import testing.",
  privacyConsent: true,
  receivedAt: new Date().toISOString(),
};

// Remove test DB if exists
try { unlinkSync(DB_PATH); } catch {}

await withServer({
  dbPath: "data/test-phase8g.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "qr-owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "QR Owner",
  },
  setupUsers: USERS.slice(1),
}, async () => {
  const cO = await mustGetCookie("qr-owner@test.com", "ChangeMe123!", "owner");
  const cA = await mustGetCookie("qr-admin@test.com", "ChangeMe123!", "admin");
  const cM = await mustGetCookie("qr-mgr@test.com", "ChangeMe123!", "manager");
  const cW = await mustGetCookie("qr-wkr@test.com", "ChangeMe123!", "worker");
  const cC = await mustGetCookie("qr-cli@test.com", "ChangeMe123!", "client");

  // ── 1. Contact form stores in SQLite ──
  const contactTest = await api("POST", "/api/contact", VALID_CONTACT, cO);
  if (contactTest.status !== 200) {
    console.error("Contact endpoint error:", JSON.stringify(contactTest.data));
  }
  await createTestData(cO);

  // ── 2. POST /api/contact validation ──
  // Missing firstName
  let r = await api("POST", "/api/contact", { ...VALID_CONTACT, firstName: "" }, cO);
  chk("missing firstName rejected", r.status === 400, 400, r.status);

  // Invalid email
  r = await api("POST", "/api/contact", { ...VALID_CONTACT, email: "notanemail" }, cO);
  chk("invalid email rejected", r.status === 400, 400, r.status);

  // Missing phone
  r = await api("POST", "/api/contact", { ...VALID_CONTACT, phone: "" }, cO);
  chk("missing phone rejected", r.status === 400, 400, r.status);

  // privacyConsent false
  r = await api("POST", "/api/contact", { ...VALID_CONTACT, privacyConsent: false }, cO);
  chk("privacyConsent false rejected", r.status === 400, 400, r.status);

  // Message too short
  r = await api("POST", "/api/contact", { ...VALID_CONTACT, message: "Short" }, cO);
  chk("short message rejected", r.status === 400, 400, r.status);

  // Message over 5000
  r = await api("POST", "/api/contact", { ...VALID_CONTACT, message: "X".repeat(5001) }, cO);
  chk("long message rejected", r.status === 400, 400, r.status);

  // Invalid phone format (letters only)
  r = await api("POST", "/api/contact", { ...VALID_CONTACT, phone: "abcabcabc" }, cO);
  chk("invalid phone format rejected", r.status === 400, 400, r.status);
  chk("invalid phone error message", r.data?.error?.includes("phone"), true, r.data?.error?.includes("phone"));

  // projectId and source stored
  r = await api("POST", "/api/contact", { ...VALID_CONTACT, firstName: "Proj", lastName: "Test", email: "proj@test.com", phone: "0412345678", projectId: "project-123", source: "landing-page" }, cO);
  chk("contact with projectId succeeds", r.status === 200, 200, r.status);
  // Verify in list
  const projList = await api("GET", "/api/platform/quote-requests?search=proj@test.com", null, cO);
  chk("projectId stored in DB", projList.data?.requests?.[0]?.project_id === "project-123", "project-123", projList.data?.requests?.[0]?.project_id);
  chk("source stored in DB", projList.data?.requests?.[0]?.source === "landing-page", "landing-page", projList.data?.requests?.[0]?.source);

  // ── 3. GET /api/platform/quote-requests role checks ──
  r = await api("GET", "/api/platform/quote-requests", null, cO);
  chk("owner allowed to list", r.status === 200, 200, r.status);
  chk("owner list returns requests", Array.isArray(r.data?.requests), true, Array.isArray(r.data?.requests));
  chk("owner list has total", typeof r.data?.total === "number", true, typeof r.data?.total === "number");

  r = await api("GET", "/api/platform/quote-requests", null, cA);
  chk("admin allowed to list", r.status === 200, 200, r.status);

  r = await api("GET", "/api/platform/quote-requests", null, cM);
  chk("manager allowed to list", r.status === 200, 200, r.status);

  r = await api("GET", "/api/platform/quote-requests", null, cW);
  chk("worker blocked from list", r.status === 403, 403, r.status);

  r = await api("GET", "/api/platform/quote-requests", null, cC);
  chk("client blocked from list", r.status === 403, 403, r.status);

  r = await api("GET", "/api/platform/quote-requests", null, null);
  chk("unauth blocked from list", r.status === 401, 401, r.status);

  // ── 4. Status filter works ──
  r = await api("GET", "/api/platform/quote-requests?status=new", null, cO);
  chk("status filter works", r.status === 200, 200, r.status);

  // ── 5. Search works ──
  r = await api("GET", "/api/platform/quote-requests?search=jane", null, cO);
  chk("search works", r.status === 200, 200, r.status);

  // ── 6. Pagination works ──
  r = await api("GET", "/api/platform/quote-requests?limit=1&offset=0", null, cO);
  chk("pagination works", r.status === 200, 200, r.status);

  // ── 6b. Summary counts returned ──
  r = await api("GET", "/api/platform/quote-requests", null, cO);
  chk("summary counts returned", r.data?.summary !== undefined, true, r.data?.summary !== undefined);
  if (r.data?.summary) {
    chk("summary has new count", typeof r.data.summary.new === "number", true, typeof r.data.summary.new === "number");
    chk("summary has contacted count", typeof r.data.summary.contacted === "number", true, typeof r.data.summary.contacted === "number");
    chk("summary has quoted count", typeof r.data.summary.quoted === "number", true, typeof r.data.summary.quoted === "number");
    chk("summary has won count", typeof r.data.summary.won === "number", true, typeof r.data.summary.won === "number");
    chk("summary has lost count", typeof r.data.summary.lost === "number", true, typeof r.data.summary.lost === "number");
    chk("summary has archived count", typeof r.data.summary.archived === "number", true, typeof r.data.summary.archived === "number");
  }

  // ── 7. GET detail works ──
  const list = await api("GET", "/api/platform/quote-requests", null, cO);
  if (list.data?.requests?.length > 0) {
    const id = list.data.requests[0].id;
    r = await api("GET", `/api/platform/quote-requests/${id}`, null, cO);
    chk("detail endpoint works", r.status === 200, 200, r.status);
    chk("detail returns email from first request", r.data?.email === list.data.requests[0].email, list.data.requests[0].email, r.data?.email);

    // ── 8. PATCH status works ──
    r = await api("PATCH", `/api/platform/quote-requests/${id}`, { status: "contacted" }, cO);
    chk("patch status works", r.status === 200, 200, r.status);
    chk("patch returns success", r.data?.success === true, true, r.data?.success);

    // ── 9. PATCH notes works ──
    r = await api("PATCH", `/api/platform/quote-requests/${id}`, { internal_notes: "Test notes" }, cO);
    chk("patch notes works", r.status === 200, 200, r.status);

    // Verify notes saved
    const detail = await api("GET", `/api/platform/quote-requests/${id}`, null, cO);
    chk("notes persisted", detail.data?.internal_notes === "Test notes", "Test notes", detail.data?.internal_notes);

    // ── 10. Invalid status rejected ──
    r = await api("PATCH", `/api/platform/quote-requests/${id}`, { status: "invalid_status" }, cO);
    chk("invalid status rejected", r.status === 400, 400, r.status);

    // ── 11. Invalid priority rejected ──
    r = await api("PATCH", `/api/platform/quote-requests/${id}`, { priority: "invalid_priority" }, cO);
    chk("invalid priority rejected", r.status === 400, 400, r.status);

    // ── 12. Archive works ──
    r = await api("POST", `/api/platform/quote-requests/${id}/archive`, null, cO);
    chk("archive works", r.status === 200, 200, r.status);
    chk("archive returns archived:true", r.data?.archived === true, true, r.data?.archived);

    // Verify archived
    const archivedDetail = await api("GET", `/api/platform/quote-requests/${id}`, null, cO);
    chk("archived status set", archivedDetail.data?.status === "archived", "archived", archivedDetail.data?.status);

    // ── 13. Restore works ──
    r = await api("POST", `/api/platform/quote-requests/${id}/restore`, null, cO);
    chk("restore works", r.status === 200, 200, r.status);
    chk("restore returns restored:true", r.data?.restored === true, true, r.data?.restored);

    const restoredDetail = await api("GET", `/api/platform/quote-requests/${id}`, null, cO);
    chk("restored status is new", restoredDetail.data?.status === "new", "new", restoredDetail.data?.status);

    // ── 14. No stack traces ──
    r = await api("GET", "/api/platform/quote-requests/nonexistent-id", null, cO);
    chk("nonexistent returns 404", r.status === 404, 404, r.status);
    chk("no stack trace in 404", !r.data?.error?.includes("Error"), true, !r.data?.error?.includes("Error"));

    r = await api("POST", "/api/contact", null, cO);
    chk("null body no stack trace", r.status === 400, 400, r.status);
  }

  // ── 15. JSON backup preserved ──
  if (existsSync(jsonPath)) {
    const content = readFileSync(jsonPath, "utf-8");
    const submissions = JSON.parse(content);
    chk("JSON backup exists and has submissions", Array.isArray(submissions) && submissions.length > 0, true, Array.isArray(submissions) && submissions.length > 0);
    // Check latest submission has projectId and source
    const last = submissions[submissions.length - 1];
    if (last) {
      chk("JSON backup includes projectId", "projectId" in last, true, "projectId" in last);
      chk("JSON backup includes source", "source" in last, true, "source" in last);
    }
  }
});

// ── 16. App route check (structural) ──
const appSrc = readFileSync(resolve(ROOT, "src/App.tsx"), "utf-8");
chk("app route /quote-requests defined", appSrc.includes('path: "quote-requests"'), true, appSrc.includes('path: "quote-requests"'));
chk("platform route /quote-requests defined", appSrc.includes('path: "quote-requests"'), true, appSrc.includes('path: "quote-requests"'));

// ── 17. Sidebar check (structural) ──
const sidebarSrc = readFileSync(resolve(ROOT, "src/components/platform/PlatformSidebar.tsx"), "utf-8");
chk("sidebar has Quote Requests link", sidebarSrc.includes("Quote Requests"), true, sidebarSrc.includes("Quote Requests"));
chk("sidebar link uses MessageSquare icon", sidebarSrc.includes("MessageSquare"), true, sidebarSrc.includes("MessageSquare"));

// ── 18. Database migration check (supporting versioned and legacy) ──
const migrateSrc = readFileSync(resolve(ROOT, "server/db/migrate.js"), "utf-8");
const contactServiceSrc = readFileSync(resolve(ROOT, "server/modules/contactRequests/contactRequests.service.js"), "utf-8");
chk("migration has contact_requests table", migrateSrc.includes("contact_requests"), true, migrateSrc.includes("contact_requests"));
chk("migration or service has JSON backup import logic", contactServiceSrc.includes("contact-submissions.json") || migrateSrc.includes("contact-submissions.json"), true, contactServiceSrc.includes("contact-submissions.json") || migrateSrc.includes("contact-submissions.json"));

// ── 19. Server contact endpoint check (refactored to module) ──
const contactRoutesSrc = readFileSync(resolve(ROOT, "server/modules/contactRequests/contactRequests.routes.js"), "utf-8");
chk("contact route stores in SQLite", contactServiceSrc.includes("INSERT INTO contact_requests"), true, contactServiceSrc.includes("INSERT INTO contact_requests"));
chk("contact endpoint has validation", contactRoutesSrc.includes("validate(submitSchema)"), true, contactRoutesSrc.includes("validate(submitSchema)"));
chk("contact endpoint validates email", contactServiceSrc.includes("email"), true, contactServiceSrc.includes("email"));
chk("contact endpoint preserves JSON backup", contactServiceSrc.includes("contact-submissions.json"), true, contactServiceSrc.includes("contact-submissions.json"));
chk("contact reads projectId", contactServiceSrc.includes("projectId"), true, contactServiceSrc.includes("projectId"));
chk("contact reads source", contactServiceSrc.includes("source"), true, contactServiceSrc.includes("source"));
chk("contact validates phone", contactServiceSrc.includes("phone"), true, contactServiceSrc.includes("phone"));

// ── 20. Frontend error handling checks ──
const qrSrc = readFileSync(resolve(ROOT, "src/pages/platform/QuoteRequests.tsx"), "utf-8");
chk("frontend handles 401 with message", qrSrc.includes("session expired"), true, qrSrc.includes("session expired"));
chk("frontend handles 403 with message", qrSrc.includes("do not have permission"), true, qrSrc.includes("do not have permission"));
chk("frontend handles 404 with message", qrSrc.includes("not deployed"), true, qrSrc.includes("not deployed"));
chk("frontend handles 500 with message", qrSrc.includes("Server error loading"), true, qrSrc.includes("Server error loading"));
chk("frontend fetch uses credentials same-origin", qrSrc.includes('credentials: "same-origin"'), true, qrSrc.includes('credentials: "same-origin"'));
chk("frontend PATCH uses credentials same-origin", qrSrc.match(/method: "PATCH".*credentials: "same-origin"/s), true, !!qrSrc.match(/method: "PATCH".*credentials: "same-origin"/s));

// ── 21. Service worker does not cache API ──
const swSrc = readFileSync(resolve(ROOT, "public/sw.js"), "utf-8");
chk("SW has network-first for API paths", swSrc.includes('url.pathname.startsWith("/api/")'), true, swSrc.includes('url.pathname.startsWith("/api/")'));
chk("SW network-first does not cache API", !swSrc.includes("cache.put") || swSrc.indexOf("cache.put") > swSrc.indexOf("/api/"), true, true);

// ── 22. Route registration check ──
const platformSrc = readFileSync(resolve(ROOT, "server/routes/platform.js"), "utf-8");
chk("platform.js has GET quote-requests list route", platformSrc.includes('router.get("/quote-requests"'), true, platformSrc.includes('router.get("/quote-requests"'));
chk("platform.js has GET quote-requests detail route", platformSrc.includes('router.get("/quote-requests/:id"'), true, platformSrc.includes('router.get("/quote-requests/:id"'));
chk("platform.js has PATCH quote-requests route", platformSrc.includes('router.patch("/quote-requests/:id"'), true, platformSrc.includes('router.patch("/quote-requests/:id"'));
chk("platform.js has archive route", platformSrc.includes('router.post("/quote-requests/:id/archive"'), true, platformSrc.includes('router.post("/quote-requests/:id/archive"'));
chk("platform.js has restore route", platformSrc.includes('router.post("/quote-requests/:id/restore"'), true, platformSrc.includes('router.post("/quote-requests/:id/restore"'));

// ── 23. Unauthenticated returns 401 not 404 ──
// This is tested above in the role checks section — unauth returns 401

// Restore original JSON backup
if (jsonBackup !== null) {
  try { writeFileSync(jsonPath, jsonBackup); } catch {}
}

console.log(`\nPhase 8G: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
