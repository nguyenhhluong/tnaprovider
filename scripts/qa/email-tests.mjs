import { withServer } from "./test-harness.mjs";

const BASE = "http://127.0.0.1:3007";
let pass = 0, fail = 0;
const tests = [];

async function api(method, path, body, cookie) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  if (cookie) opts.headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, cookie: res.headers.get("set-cookie") };
}

function chk(label, condition, expected, actual) {
  if (condition) { pass++; }
  else { fail++; console.error(`FAIL ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`); }
}

function describe(name, fn) {
  tests.push({ name, fn });
}

// ── Mailer Config Tests ──
describe("Mailer configuration", async () => {
  const { sendEmail } = await import("../../server/email/mailer.js");

  // We can't easily test nodemailer transport creation without mocking,
  // but we can verify the config functions work
  chk("mailer module exports sendEmail", typeof sendEmail === "function", "function", typeof sendEmail);
});

// ── Template Tests ──
describe("Email templates", async () => {
  const { quoteRequestConfirmation } = await import("../../server/email/templates/quoteRequestConfirmation.js");
  const { newQuoteAdmin } = await import("../../server/email/templates/newQuoteAdmin.js");
  const { userInvitation } = await import("../../server/email/templates/userInvitation.js");
  const { passwordReset } = await import("../../server/email/templates/passwordReset.js");
  const { quoteStatusChanged } = await import("../../server/email/templates/quoteStatusChanged.js");

  const cr = quoteRequestConfirmation({ customerName: "John Smith", referenceNumber: "TNA-2026-12345" });
  chk("quote confirmation: customer name renders", cr.html.includes("John Smith"), true, cr.html.includes("John Smith"));
  chk("quote confirmation: reference renders", cr.html.includes("TNA-2026-12345"), true, cr.html.includes("TNA-2026-12345"));
  chk("quote confirmation: subject correct", cr.subject.includes("Quote Request Received"), true, cr.subject.includes("Quote Request Received"));
  chk("quote confirmation: plain text exists", cr.text.length > 0, true, cr.text.length > 0);

  const na = newQuoteAdmin({
    referenceNumber: "TNA-2026-12345",
    customerName: "John Smith",
    customerEmail: "john@example.com",
    customerPhone: "0400 000 000",
    company: "ACME Pty Ltd",
    message: "Test message",
    adminQuoteUrl: "https://tnaprovider.com.au/admin/quote",
  });
  chk("admin notification: customer name renders", na.html.includes("John Smith"), true, na.html.includes("John Smith"));
  chk("admin notification: admin link renders", na.html.includes("https://tnaprovider.com.au/admin/quote"), true, na.html.includes("https://tnaprovider.com.au/admin/quote"));
  chk("admin notification: subject correct", na.subject.includes("New Quote Request"), true, na.subject.includes("New Quote Request"));
  chk("admin notification: plain text exists", na.text.length > 0, true, na.text.length > 0);

  const ui = userInvitation({
    name: "Jane Doe",
    email: "jane@example.com",
    inviteUrl: "https://tnaprovider.com.au/accept-invite?token=abc",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  chk("invitation: name renders", ui.html.includes("Jane Doe"), true, ui.html.includes("Jane Doe"));
  chk("invitation: invite link renders", ui.html.includes("https://tnaprovider.com.au/accept-invite?token=abc"), true, ui.html.includes("https://tnaprovider.com.au/accept-invite?token=abc"));
  chk("invitation: subject correct", ui.subject.includes("Invited to Join"), true, ui.subject.includes("Invited to Join"));
  chk("invitation: plain text exists", ui.text.length > 0, true, ui.text.length > 0);

  const pr = passwordReset({
    name: "Jane Doe",
    resetUrl: "https://tnaprovider.com.au/reset-password?token=abc",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
  chk("password reset: name renders", pr.html.includes("Jane Doe"), true, pr.html.includes("Jane Doe"));
  chk("password reset: reset link renders", pr.html.includes("https://tnaprovider.com.au/reset-password?token=abc"), true, pr.html.includes("https://tnaprovider.com.au/reset-password?token=abc"));
  chk("password reset: subject correct", pr.subject.includes("Reset Your"), true, pr.subject.includes("Reset Your"));
  chk("password reset: plain text exists", pr.text.length > 0, true, pr.text.length > 0);

  const qs = quoteStatusChanged({
    customerName: "John Smith",
    referenceNumber: "QT-2026-00001",
    oldStatus: "approved",
    newStatus: "sent",
    quoteUrl: "https://tnaprovider.com.au/quote/public",
  });
  chk("status change: customer name renders", qs.html.includes("John Smith"), true, qs.html.includes("John Smith"));
  chk("status change: reference renders", qs.html.includes("QT-2026-00001"), true, qs.html.includes("QT-2026-00001"));
  chk("status change: subject correct", qs.subject.includes("Status Updated"), true, qs.subject.includes("Status Updated"));
  chk("status change: plain text exists", qs.text.length > 0, true, qs.text.length > 0);
});

// ── Email Job Service Tests ──
describe("Email job service", async () => {
  const { createEmailJob, getEmailJob, updateEmailJobStatus, listEmailJobs, retryEmailJob, getEmailDeliveryStatusForEntity } = await import("../../server/email/emailJobService.js");

  // Create a job
  const jobId = createEmailJob({
    type: "PASSWORD_RESET",
    recipient: "test@example.com",
    subject: "Test Subject",
    relatedEntityType: "user",
    relatedEntityId: "user-123",
    payloadJson: { html: "<p>Test</p>", text: "Test" },
  });
  chk("job created with ID", !!jobId, true, !!jobId);

  // Get job
  const job = getEmailJob(jobId);
  chk("job found", job !== null, true, job !== null);
  chk("job type correct", job.type === "PASSWORD_RESET", true, job.type);
  chk("job status is PENDING", job.status === "PENDING", true, job.status);
  chk("job recipient correct", job.recipient === "test@example.com", true, job.recipient);

  // Update to SENT
  updateEmailJobStatus(jobId, "SENT", { smtpMessageId: "test-msg-id", sentAt: new Date().toISOString() });
  const updated = getEmailJob(jobId);
  chk("job status updated to SENT", updated.status === "SENT", true, updated.status);
  chk("smtp message id stored", updated.smtp_message_id === "test-msg-id", true, updated.smtp_message_id);

  // Create failed job for retry test
  const failJobId = createEmailJob({
    type: "QUOTE_RECEIVED_CUSTOMER",
    recipient: "fail@example.com",
    subject: "Fail Test",
  });
  updateEmailJobStatus(failJobId, "FAILED", { lastError: "Connection refused", attemptCount: 1 });
  const failJob = getEmailJob(failJobId);
  chk("failed job status correct", failJob.status === "FAILED", true, failJob.status);
  chk("failed job error stored", failJob.last_error === "Connection refused", true, failJob.last_error);

  // Retry
  retryEmailJob(failJobId);
  const retried = getEmailJob(failJobId);
  chk("retry resets status to PENDING", retried.status === "PENDING", true, retried.status);
  chk("retry clears last_error", retried.last_error === null || retried.last_error === undefined, true, retried.last_error);

  // List jobs
  const listing = listEmailJobs({ status: "SENT" });
  chk("list filters by status", listing.data.some(j => j.status === "SENT"), true, listing.data.some(j => j.status === "SENT"));

  // Get delivery status for entity
  const statuses = getEmailDeliveryStatusForEntity("user", "user-123");
  chk("delivery status found for entity", Object.keys(statuses).length > 0, true, Object.keys(statuses).length > 0);
});

// ── Contact Form Email Workflow Tests ──
describe("Contact form email workflow", async () => {
  const ownerCookie = await login("email-owner@test.com", "ChangeMe123!");
  chk("owner logged in", ownerCookie !== null, true, ownerCookie !== null);

  // Submit contact request
  const contact = await api("POST", "/api/contact", {
    firstName: "Email",
    lastName: "Test",
    email: "email-customer@test.com",
    phone: "0400000000",
    service: "construction",
    location: "Sydney NSW",
    message: "I need a quote for a test project. Please contact me.",
    privacyConsent: true,
  });
  chk("contact submission returns success", contact.data?.success === true, true, contact.data?.success);
  chk("contact returns reference number", !!contact.data?.referenceNumber, true, !!contact.data?.referenceNumber);

  // Check email jobs were created
  const contactId = contact.data?.data?.id;
  const jobs = await api("GET", `/api/admin/email-delivery-status/contact_request/${contactId}`, null, ownerCookie);
  chk("email jobs exist for contact", jobs.data?.success === true, true, jobs.data?.success);

  // Check that email jobs were created
  const jobsList = await api("GET", `/api/admin/email-jobs?relatedEntityType=contact_request&relatedEntityId=${contactId}`, null, ownerCookie);
  chk("email jobs listed for contact", jobsList.data?.data?.length >= 2, true, jobsList.data?.data?.length);

  // At least one job should be SENT or FAILED (not still PENDING since processEmailJob was called)
  const customerJob = jobsList.data?.data?.find(j => j.type === "QUOTE_RECEIVED_CUSTOMER");
  chk("customer email job exists", !!customerJob, true, !!customerJob);

  const adminJob = jobsList.data?.data?.find(j => j.type === "QUOTE_RECEIVED_ADMIN");
  chk("admin email job exists", !!adminJob, true, !!adminJob);
});

// ── User Invitation Email Workflow Tests ──
describe("User invitation email workflow", async () => {
  const ownerCookie = await login("email-owner@test.com", "ChangeMe123!");

  const invite = await api("POST", "/api/platform/users/invite", {
    email: "invite-test@test.com",
    name: "Invite Test User",
    role: "manager",
  }, ownerCookie);
  chk("invite created", [200, 201].includes(invite.status), true, invite.status);
  chk("invite has devToken in test", !!invite.data?.devToken, true, !!invite.data?.devToken);

  // Check email job exists for invitation
  const jobsList = await api("GET", "/api/admin/email-jobs?type=USER_INVITATION", null, ownerCookie);
  const inviteJob = jobsList.data?.data?.find(j => j.recipient === "invite-test@test.com");
  chk("invitation email job created", !!inviteJob, true, !!inviteJob);

  // Accept invite
  const accept = await api("POST", "/api/auth/accept-invite", {
    token: invite.data.devToken,
    password: "NewPassword123!",
  });
  chk("invite accepted", accept.data?.success === true, true, accept.data?.success);

  // Try accepting again (should fail - token consumed)
  const rejectAccept = await api("POST", "/api/auth/accept-invite", {
    token: invite.data.devToken,
    password: "NewPassword456!",
  });
  chk("reused invite token rejected", rejectAccept.status === 400, 400, rejectAccept.status);
});

// ── Password Reset Email Workflow Tests ──
describe("Password reset email workflow", async () => {
  // Forgot password for existing user
  const forgot = await api("POST", "/api/auth/forgot-password", { email: "email-owner@test.com" });
  chk("forgot-password returns message", !!forgot.data?.message, true, !!forgot.data?.message);
  chk("forgot-password returns devToken in test", !!forgot.data?.devToken, true, !!forgot.data?.devToken);

  // Check email job exists
  const ownerCookie = await login("email-owner@test.com", "ChangeMe123!");
  const jobsList = await api("GET", "/api/admin/email-jobs?type=PASSWORD_RESET", null, ownerCookie);
  const resetJob = jobsList.data?.data?.find(j => j.recipient === "email-owner@test.com");
  chk("password reset email job created", !!resetJob, true, !!resetJob);

  // Use the token to reset password
  const reset = await api("POST", "/api/auth/reset-password", {
    token: forgot.data.devToken,
    password: "NewPassword789!",
  });
  chk("password reset successful", reset.data?.success === true, true, reset.data?.success);

  // Try reusing token (should fail)
  const rejectReset = await api("POST", "/api/auth/reset-password", {
    token: forgot.data.devToken,
    password: "AnotherPassword1!",
  });
  chk("reused reset token rejected", rejectReset.status === 400, 400, rejectReset.status);
});

// ── Retry Email Tests ──
describe("Email retry workflow", async () => {
  const ownerCookie = await login("email-owner@test.com", "ChangeMe123!");

  // Get a failed job if any, or create a job and mark it failed
  const jobs = await api("GET", "/api/admin/email-jobs?status=FAILED", null, ownerCookie);

  if (jobs.data?.data?.length > 0) {
    const failedJob = jobs.data.data[0];
    const retry = await api("POST", `/api/admin/email-jobs/${failedJob.id}/retry`, {}, ownerCookie);
    chk("retry endpoint responds", [200].includes(retry.status), true, retry.status);
  } else {
    // Create a job in the DB directly and try to retry
    console.log("No failed jobs to retry");
  }

  // Retry on SENT job should fail
  const sentJobs = await api("GET", "/api/admin/email-jobs?status=SENT", null, ownerCookie);
  if (sentJobs.data?.data?.length > 0) {
    const sentJob = sentJobs.data.data[0];
    const retry = await api("POST", `/api/admin/email-jobs/${sentJob.id}/retry`, {}, ownerCookie);
    chk("cannot retry already sent job", retry.status === 400, 400, retry.status);
  }
});

// ── Helper: Login ──
async function login(email, password) {
  const r = await api("POST", "/api/auth/login", { email, password });
  return r.cookie || null;
}

// ── Setup owner user for tests ──
const SETUP_USERS = [
  { email: "email-owner@test.com", password: "ChangeMe123!", name: "Email Owner", role: "owner" },
];

// ── Run tests ──
console.log("=== Email Automation Tests ===");

try {
  await withServer({ dbPath: "data/test-email.db", setupEnv: { SEED_OWNER_EMAIL: "test@test.com", SEED_OWNER_PASSWORD: "test123", SEED_OWNER_NAME: "Test" }, setupUsers: SETUP_USERS }, async () => {
    for (const t of tests) {
      try {
        await t.fn();
        console.log(`  PASS: ${t.name}`);
      } catch (err) {
        fail++;
        console.error(`  FAIL: ${t.name}: ${err.message}`);
        console.error(err.stack);
      }
    }
  });
} catch (err) {
  console.error("Server setup failed:", err.message);
  process.exit(1);
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
else process.exit(0);
