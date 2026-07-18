const BLOCKED_DOMAINS = new Set([
  'test.com',
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  'invalid',
  'local',
  'localdomain',
  'broadcasthost',
  'ip6-localhost',
  'ip6-loopback',
  '0.0.0.0',
]);

const BLOCKED_DOMAIN_SUFFIXES = ['.test', '.invalid', '.localhost'];

const BLOCKED_PREFIXES = [
  'invite-test@',
  'email-customer@',
  'test@',
  'no-reply@',
  'mailer-daemon@',
  'postmaster@',
];

function getDomain(email) {
  if (!email || typeof email !== 'string') return '';
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).toLowerCase().trim();
}

function isAllowedTestRecipient(email) {
  if (process.env.ALLOW_TEST_EMAIL_RECIPIENTS === 'true') return true;
  if (process.env.APP_ENV === 'test' || process.env.APP_ENV === 'development') return true;
  if (process.env.MAIL_PROVIDER === 'mock') return true;
  return false;
}

export function validateRecipient(email) {
  if (!email || typeof email !== 'string') {
    return { allowed: false, reason: 'INVALID_EMAIL', error: 'INVALID_EMAIL_RECIPIENT' };
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    return { allowed: false, reason: 'INVALID_EMAIL', error: 'INVALID_EMAIL_RECIPIENT' };
  }

  if (isAllowedTestRecipient(trimmed)) {
    return { allowed: true, reason: 'TEST_MODE' };
  }

  const domain = getDomain(trimmed);
  if (!domain) {
    return { allowed: false, reason: 'INVALID_DOMAIN', error: 'INVALID_EMAIL_RECIPIENT_DOMAIN' };
  }

  if (BLOCKED_DOMAINS.has(domain)) {
    return { allowed: false, reason: 'BLOCKED_DOMAIN', error: 'INVALID_EMAIL_RECIPIENT_DOMAIN' };
  }

  for (const suffix of BLOCKED_DOMAIN_SUFFIXES) {
    if (domain.endsWith(suffix)) {
      return { allowed: false, reason: 'BLOCKED_DOMAIN', error: 'INVALID_EMAIL_RECIPIENT_DOMAIN' };
    }
  }

  for (const prefix of BLOCKED_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return { allowed: false, reason: 'BLOCKED_PREFIX', error: 'INVALID_EMAIL_RECIPIENT' };
    }
  }

  return { allowed: true, reason: 'VALID' };
}

export function assertValidRecipient(email) {
  const result = validateRecipient(email);
  if (!result.allowed) {
    const err = new Error(`Blocked email recipient: ${result.reason} (${email})`);
    err.code = result.error;
    err.statusCode = 400;
    throw err;
  }
  return true;
}

export { BLOCKED_DOMAINS, BLOCKED_DOMAIN_SUFFIXES, BLOCKED_PREFIXES };
