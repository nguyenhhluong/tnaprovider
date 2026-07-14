import 'dotenv/config';
import { buildAppUrl, getAppBaseUrl } from '../server/config/appUrl.js';

let pass = 0;
let fail = 0;

function check(label, condition) {
  if (condition) { pass++; } else { fail++; console.error(`FAIL: ${label}`); }
}

try {
  const base = getAppBaseUrl();
  console.log(`Base URL: ${base}`);

  // Quote admin link
  const quoteId = '5b5945f7-26ac-493a-97eb-fc3634a01e07';
  const adminUrl = buildAppUrl('/platform/quote-requests', { id: quoteId });
  check('Admin URL has correct origin', adminUrl.startsWith(base.replace(/\/+$/, '')));
  check('Admin URL contains quote-requests path', adminUrl.includes('/platform/quote-requests'));
  check('Admin URL contains quote ID', adminUrl.includes(quoteId));
  check('Admin URL has HTTPS', adminUrl.startsWith('https://'));
  check('Admin URL no MY_APP_URL', !adminUrl.includes('MY_APP_URL'));
  check('Admin URL no placeholder', !adminUrl.includes('YOUR_APP_URL'));
  check('Admin URL no localhost', !adminUrl.includes('localhost'));

  // Invitation link
  const inviteUrl = buildAppUrl('/accept-invite', { token: 'abc123token' });
  check('Invite URL has correct origin', inviteUrl.startsWith(base.replace(/\/+$/, '')));
  check('Invite URL has token', inviteUrl.includes('abc123token'));
  check('Invite URL no MY_APP_URL', !inviteUrl.includes('MY_APP_URL'));

  // Password reset link
  const resetUrl = buildAppUrl('/reset-password', { token: 'def456token' });
  check('Reset URL has correct origin', resetUrl.startsWith(base.replace(/\/+$/, '')));
  check('Reset URL has token', resetUrl.includes('def456token'));
  check('Reset URL no MY_APP_URL', !resetUrl.includes('MY_APP_URL'));

  // Quote status link
  const statusUrl = buildAppUrl('/platform/quotes', { id: quoteId });
  check('Status URL has correct origin', statusUrl.startsWith(base.replace(/\/+$/, '')));
  check('Status URL contains quote ID', statusUrl.includes(quoteId));

  console.log(`\nResults: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
} catch (err) {
  console.error('URL verification failed:', err.message);
  process.exit(1);
}
