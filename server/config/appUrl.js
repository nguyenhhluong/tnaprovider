export function getAppBaseUrl() {
  const raw = process.env.APP_BASE_URL || process.env.APP_URL || '';

  const value = raw.trim();

  if (!value) {
    const error = new Error('APP_BASE_URL is required for email links');
    error.code = 'APP_BASE_URL_MISSING';
    throw error;
  }

  if (value === 'MY_APP_URL' || value === 'YOUR_APP_URL') {
    const error = new Error(`APP_BASE_URL is set to "${value}" — this is a placeholder, not a real URL`);
    error.code = 'APP_BASE_URL_PLACEHOLDER';
    throw error;
  }

  return value.replace(/\/+$/, '');
}

export function buildAppUrl(pathname, searchParams = {}) {
  const base = getAppBaseUrl();
  const baseUrl = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const url = new URL(cleanPath, `${baseUrl}/`);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function validateAppBaseUrl(strict = false) {
  const raw = process.env.APP_BASE_URL || process.env.APP_URL || '';
  const value = raw.trim();

  if (!value) {
    if (strict) {
      throw new Error('APP_BASE_URL is not configured');
    }
    return { valid: false, reason: 'not configured' };
  }

  if (value === 'MY_APP_URL' || value === 'YOUR_APP_URL') {
    return { valid: false, reason: `placeholder value: ${value}` };
  }

  try {
    const url = new URL(value);
    if (!url.protocol.startsWith('http')) {
      return { valid: false, reason: `invalid protocol: ${url.protocol}` };
    }
    if (strict && url.protocol !== 'https:') {
      return { valid: false, reason: `non-HTTPS in production: ${url.protocol}` };
    }
    if (!url.hostname) {
      return { valid: false, reason: 'no hostname' };
    }
    if (url.hash) {
      return { valid: false, reason: 'contains hash fragment' };
    }
    return { valid: true, value: value.replace(/\/+$/, '') };
  } catch {
    return { valid: false, reason: `invalid URL: ${value}` };
  }
}
