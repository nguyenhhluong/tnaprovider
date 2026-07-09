import { withServer, mustGetCookie } from "./test-harness.mjs";
import { existsSync, readFileSync } from "fs";
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

const USERS = [
  { email: "h-owner@test.com", password: "ChangeMe123!", name: "H Owner", role: "owner" },
  { email: "h-admin@test.com", password: "ChangeMe123!", name: "H Admin", role: "admin" },
  { email: "h-mgr@test.com", password: "ChangeMe123!", name: "H Mgr", role: "manager" },
  { email: "h-wkr@test.com", password: "ChangeMe123!", name: "H Worker", role: "worker" },
  { email: "h-cli@test.com", password: "ChangeMe123!", name: "H Client", role: "client" },
];

console.log("=== Phase 8H: Professional Quote Builder ===");

await withServer({
  dbPath: "data/test-phase8h.db",
  setupEnv: {
    SEED_OWNER_EMAIL: "h-owner@test.com",
    SEED_OWNER_PASSWORD: "ChangeMe123!",
    SEED_OWNER_NAME: "H Owner",
  },
  setupUsers: USERS.slice(1),
}, async () => {
  const cO = await mustGetCookie("h-owner@test.com", "ChangeMe123!", "owner");
  const cA = await mustGetCookie("h-admin@test.com", "ChangeMe123!", "admin");
  const cM = await mustGetCookie("h-mgr@test.com", "ChangeMe123!", "manager");
  const cW = await mustGetCookie("h-wkr@test.com", "ChangeMe123!", "worker");
  const cC = await mustGetCookie("h-cli@test.com", "ChangeMe123!", "client");

  // ── Role checks ──
  let r = await api("GET", "/api/quotes", null, null);
  chk("unauth blocked", r.status === 401, 401, r.status);
  r = await api("GET", "/api/quotes", null, cW);
  chk("worker blocked", r.status === 403, 403, r.status);
  r = await api("GET", "/api/quotes", null, cC);
  chk("client blocked", r.status === 403, 403, r.status);
  r = await api("GET", "/api/quotes", null, cO);
  chk("owner allowed to list", r.status === 200, 200, r.status);
  r = await api("GET", "/api/quotes", null, cA);
  chk("admin allowed to list", r.status === 200, 200, r.status);
  r = await api("GET", "/api/quotes", null, cM);
  chk("manager allowed to list", r.status === 200, 200, r.status);

  // ── Create quote atomically with sections/items ──
  r = await api("POST", "/api/quotes", {
    client_name: "Test Client",
    client_email: "client@test.com",
    client_phone: "0400000000",
    project_name: "Phase 8H Test Project",
    project_location: "Sydney",
    scope: "Test scope of works",
    valid_until: "2026-08-09",
    sections: [
      { title: "Section 1", sort_order: 0, items: [
        { name: "Item 1", description: "First item", quantity: 2, unit: "each", item_type: "material", unit_price: 100 },
        { name: "Item 2", description: "Second item", quantity: 1, unit: "hour", item_type: "labour", unit_price: 80, taxable: 1 },
      ]},
    ],
  }, cO);
  chk("create quote returns 201", r.status === 201, 201, r.status);
  chk("create returns quote_number", !!r.data?.quote_number, true, !!r.data?.quote_number);
  chk("quote number format QT-YEAR-xxxxx", /^QT-\d{4}-\d{5}$/.test(r.data?.quote_number || ""), true, /^QT-\d{4}-\d{5}$/.test(r.data?.quote_number || ""));
  chk("create returns sections", Array.isArray(r.data?.sections), true, Array.isArray(r.data?.sections));
  chk("create returns items", Array.isArray(r.data?.items), true, Array.isArray(r.data?.items));

  const quoteId = r.data?.id;
  const sectionId = r.data?.sections?.[0]?.id;

  // ── Server calculates totals ──
  chk("subtotal calculated", r.data?.subtotal > 0, true, r.data?.subtotal > 0);
  chk("gst calculated", r.data?.gst > 0, true, r.data?.gst > 0);
  chk("total calculated", r.data?.total > 0, true, r.data?.total > 0);
  chk("total = subtotal + gst", Math.abs(r.data?.total - (r.data?.subtotal + r.data?.gst)) < 0.01, true, r.data?.total);

  // ── Negative quantity rejected ──
  if (quoteId) {
    r = await api("POST", `/api/quotes/${quoteId}/items`, { description: "Bad item", quantity: -1, unit_price: 100 }, cO);
    chk("negative quantity rejected", r.status === 400, 400, r.status);
  }

  // ── Invalid item type rejected ──
  if (quoteId) {
    r = await api("POST", `/api/quotes/${quoteId}/items`, { description: "Bad type", item_type: "invalid_type", unit_price: 100 }, cO);
    chk("invalid item type rejected", r.status === 400, 400, r.status);
  }

  // ── Get quote detail ──
  if (quoteId) {
    r = await api("GET", `/api/quotes/${quoteId}`, null, cO);
    chk("get quote returns 200", r.status === 200, 200, r.status);
    chk("get quote has sections", Array.isArray(r.data?.sections), true, Array.isArray(r.data?.sections));
    chk("get quote has items", Array.isArray(r.data?.items), true, Array.isArray(r.data?.items));
    chk("get quote has reviewEvents", Array.isArray(r.data?.reviewEvents), true, Array.isArray(r.data?.reviewEvents));
    chk("get quote has documents", Array.isArray(r.data?.documents), true, Array.isArray(r.data?.documents));

    // ── Submit for review ──
    r = await api("POST", `/api/quotes/${quoteId}/submit-review`, { note: "Ready for review" }, cO);
    chk("submit review returns 200", r.status === 200, 200, r.status);
    chk("submit review status in_review", r.data?.status === "in_review", "in_review", r.data?.status);

    // ── Cannot submit again ──
    r = await api("POST", `/api/quotes/${quoteId}/submit-review`, {}, cO);
    chk("double submit rejected", r.status === 400, 400, r.status);

    // ── Reject review ──
    r = await api("POST", `/api/quotes/${quoteId}/reject-review`, { note: "Need changes" }, cO);
    chk("reject review returns 200", r.status === 200, 200, r.status);
    chk("reject review status draft", r.data?.status === "draft", "draft", r.data?.status);

    // ── Reject review without note rejected ──
    r = await api("POST", `/api/quotes/${quoteId}/reject-review`, {}, cO);
    chk("reject review without note rejected", r.status === 400, 400, r.status);

    // ── Submit and approve ──
    await api("POST", `/api/quotes/${quoteId}/submit-review`, {}, cO);
    r = await api("POST", `/api/quotes/${quoteId}/approve`, {}, cO);
    chk("approve returns 200", r.status === 200, 200, r.status);
    chk("approve status approved", r.data?.status === "approved", "approved", r.data?.status);

    // ── Draft cannot send ──
    // Already approved, so this test needs a draft quote
    const draftR = await api("POST", "/api/quotes", { title: "Draft for test", client_name: "Draft Client" }, cO);
    const draftId = draftR.data?.id;
    if (draftId) {
      r = await api("POST", `/api/quotes/${draftId}/send`, {}, cO);
      chk("draft cannot send", r.status === 400, 400, r.status);
    }

    // ── Generate PDF (approved quote) ──
    r = await api("POST", `/api/quotes/${quoteId}/generate-pdf`, {}, cO);
    chk("generate pdf returns 200", r.status === 200, 200, r.status);
    chk("pdf returned documentId", !!r.data?.documentId, true, !!r.data?.documentId);
    chk("pdf returned fileName", !!r.data?.fileName, true, !!r.data?.fileName);

    // ── Download PDF endpoint ──
    r = await api("GET", `/api/quotes/${quoteId}/pdf`, null, cO);
    chk("pdf download returns 200", r.status === 200, 200, r.status);

    // ── Send quote (approved quote) ──
    r = await api("POST", `/api/quotes/${quoteId}/send`, {}, cO);
    chk("send returns 200", r.status === 200, 200, r.status);
    chk("send status sent", r.data?.status === "sent", "sent", r.data?.status);
    chk("send has email paused message", r.data?.message?.includes("paused"), true, r.data?.message?.includes("paused"));

    // ── Cannot edit sent quote ──
    r = await api("PATCH", `/api/quotes/${quoteId}`, { client_name: "Should Fail" }, cO);
    chk("sent quote cannot be edited", r.status === 400, 400, r.status);

    // ── Accept quote ──
    r = await api("POST", `/api/quotes/${quoteId}/accept`, {}, cO);
    chk("accept returns 200", r.status === 200, 200, r.status);
    chk("accept status accepted", r.data?.status === "accepted", "accepted", r.data?.status);

    // ── Convert to project ──
    r = await api("POST", `/api/quotes/${quoteId}/convert-to-project`, {}, cO);
    chk("convert to project returns 201", r.status === 201, 201, r.status);
    chk("convert returns project id", !!r.data?.id, true, !!r.data?.id);
  }

  // ── Templates ──
  r = await api("GET", "/api/quotes/templates/list", null, cO);
  chk("templates list returns 200", r.status === 200, 200, r.status);
  chk("templates list has items", Array.isArray(r.data) && r.data.length > 0, true, Array.isArray(r.data) && r.data.length > 0);

  // ── Send with auto PDF generation ──
  // Create a new quote, approve it, send without generating PDF
  const sendQuote = await api("POST", "/api/quotes", { client_name: "Send Test", project_name: "Send Project" }, cO);
  const sendId = sendQuote.data?.id;
  if (sendId) {
    await api("POST", `/api/quotes/${sendId}/submit-review`, { note: "Review" }, cO);
    await api("POST", `/api/quotes/${sendId}/approve`, {}, cO);
    r = await api("POST", `/api/quotes/${sendId}/send`, {}, cO);
    chk("send auto-generates PDF", r.status === 200, 200, r.status);
    chk("send status sent after auto-PDF", r.data?.status === "sent", "sent", r.data?.status);
    chk("send has message", r.data?.message?.includes("paused"), true, r.data?.message?.includes("paused"));

    // Verify PDF was generated
    r = await api("GET", `/api/quotes/${sendId}/pdf`, null, cO);
    chk("PDF downloadable after auto-generate", r.status === 200, 200, r.status);
  }

  // ── Quote number uniqueness ──
  r = await api("GET", "/api/quotes", null, cO);
  const numbers = (r.data?.quotes || []).map(q => q.quote_number);
  const uniqueNumbers = new Set(numbers);
  chk("all quote numbers are unique", numbers.length === uniqueNumbers.size, true, numbers.length === uniqueNumbers.size);

  // ── Nested item negative quantity rejected ──
  r = await api("POST", "/api/quotes", {
    client_name: "Validation Test",
    sections: [{ title: "S1", items: [{ name: "Bad", quantity: -1, unit_price: 100 }] }],
  }, cO);
  chk("nested section item negative quantity rejected", r.status === 400, 400, r.status);
  chk("nested negative quantity error message", r.status === 400 && r.data?.error, true, r.status === 400 && r.data?.error);

  // ── Nested direct item negative quantity rejected ──
  r = await api("POST", "/api/quotes", {
    client_name: "Validation Test 2",
    items: [{ description: "Bad direct", quantity: -1, unit_price: 100 }],
  }, cO);
  chk("nested direct item negative quantity rejected", r.status === 400, 400, r.status);

  // ── Nested invalid item_type rejected ──
  r = await api("POST", "/api/quotes", {
    client_name: "Validation Test 3",
    items: [{ description: "Bad type", item_type: "invalid_type", unit_price: 100 }],
  }, cO);
  chk("nested invalid item_type rejected", r.status === 400, 400, r.status);

  // ── Quote number format ──
  const numbers2 = (r.data?.quotes || []).map(q => q.quote_number);
  // Verify the first quote created is QT-2026-NNNNN format
  const firstQuote = numbers[0] || "";
  chk("quote number format correct", /^QT-\d{4}-\d{5}$/.test(firstQuote), true, /^QT-\d{4}-\d{5}$/.test(firstQuote));

  // ── No stack traces ──
  r = await api("GET", "/api/quotes/nonexistent", null, cO);
  chk("nonexistent quote 404", r.status === 404, 404, r.status);
  chk("no stack trace", !r.data?.error?.includes("Error"), true, !r.data?.error?.includes("Error"));
});

// ── Structural checks ──
const migrateSrc = readFileSync(resolve(ROOT, "server/db/migrate.js"), "utf-8");
chk("migration adds quote columns", migrateSrc.includes('addColumnIfMissing(db, "quotes", "client_name"'), true, migrateSrc.includes('addColumnIfMissing(db, "quotes", "client_name"'));
chk("migration creates quote_sections", migrateSrc.includes("CREATE TABLE quote_sections"), true, migrateSrc.includes("CREATE TABLE quote_sections"));
chk("migration creates quote_documents", migrateSrc.includes("CREATE TABLE quote_documents"), true, migrateSrc.includes("CREATE TABLE quote_documents"));
chk("migration creates quote_review_events", migrateSrc.includes("CREATE TABLE quote_review_events"), true, migrateSrc.includes("CREATE TABLE quote_review_events"));
chk("migration creates quote_templates", migrateSrc.includes("CREATE TABLE quote_templates"), true, migrateSrc.includes("CREATE TABLE quote_templates"));
chk("migration creates quote_template_items", migrateSrc.includes("CREATE TABLE quote_template_items"), true, migrateSrc.includes("CREATE TABLE quote_template_items"));

const quotesSrc = readFileSync(resolve(ROOT, "server/routes/quotes.js"), "utf-8");
chk("backend has atomic create", quotesSrc.includes("createTransaction"), true, quotesSrc.includes("createTransaction"));
chk("backend has submit-review", quotesSrc.includes("submit-review"), true, quotesSrc.includes("submit-review"));
chk("backend has approve", quotesSrc.includes("/approve"), true, quotesSrc.includes("/approve"));
chk("backend has reject-review", quotesSrc.includes("reject-review"), true, quotesSrc.includes("reject-review"));
chk("backend has generate-pdf", quotesSrc.includes("generate-pdf"), true, quotesSrc.includes("generate-pdf"));
chk("backend has send endpoint", quotesSrc.includes("/send"), true, quotesSrc.includes("/send"));
chk("backend has convert-to-project", quotesSrc.includes("convert-to-project"), true, quotesSrc.includes("convert-to-project"));
chk("backend has templates list", quotesSrc.includes("templates/list"), true, quotesSrc.includes("templates/list"));
chk("backend uses pdfkit", quotesSrc.includes("pdfkit"), true, quotesSrc.includes("pdfkit"));
chk("backend has calcLineItem", quotesSrc.includes("calcLineItem"), true, quotesSrc.includes("calcLineItem"));
chk("backend send auto-generates PDF", quotesSrc.includes("pdf_file_path") && quotesSrc.includes('"sent"'), true, quotesSrc.includes("pdf_file_path") && quotesSrc.includes('"sent"'));
chk("backend validates nested items", quotesSrc.includes("if (item.quantity !== undefined && Number(item.quantity) < 0)"), true, quotesSrc.includes("item.quantity !== undefined"));
chk("backend validates nested item types", quotesSrc.includes("!ALLOWED_TYPES.includes(item.item_type)"), true, quotesSrc.includes("!ALLOWED_TYPES.includes(item.item_type)"));
chk("backend quote number retries on collision", quotesSrc.includes("while (attempts < 100)"), true, quotesSrc.includes("while (attempts < 100)"));

// ── Migration UNIQUE checks ──
chk("migration has UNIQUE index on quote_number", migrateSrc.includes("CREATE UNIQUE INDEX"), true, migrateSrc.includes("CREATE UNIQUE INDEX"));
chk("migration template prices are zero", migrateSrc.includes('price: 0'), true, migrateSrc.includes('price: 0'));

// ── Frontend structural checks ──
const qrSrc = readFileSync(resolve(ROOT, "src/pages/platform/QuoteRequests.tsx"), "utf-8");
chk("QuoteRequests page has Create Quote From Request", qrSrc.includes("Create Quote From Request"), true, qrSrc.includes("Create Quote From Request"));

console.log(`\nPhase 8H: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
