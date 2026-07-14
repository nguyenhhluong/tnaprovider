import 'dotenv/config';

async function main() {
  const args = process.argv.slice(2);
  const to = args.find((a) => a.startsWith('--to='))?.split('=')[1];
  const file = args.find((a) => a.startsWith('--attach='))?.split('=')[1];

  if (!to) {
    console.error('Usage: node scripts/smoke-api-send.mjs --to=real@address.com [--attach=./file.pdf]');
    console.error('');
    console.error('Required env vars:');
    console.error('  SMOKE_APP_URL  - Application base URL (e.g. https://app.tnaprovider.com.au)');
    console.error('  SMOKE_EMAIL    - Admin login email');
    console.error('  SMOKE_PASSWORD - Admin login password');
    process.exit(1);
  }

  const appUrl = process.env.SMOKE_APP_URL;
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  if (!appUrl) { console.error('SMOKE_APP_URL is not set'); process.exit(1); }
  if (!email) { console.error('SMOKE_EMAIL is not set'); process.exit(1); }
  if (!password) { console.error('SMOKE_PASSWORD is not set'); process.exit(1); }

  // Login
  const loginRes = await fetch(`${appUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    process.exit(1);
  }
  const cookies = loginRes.headers.get('set-cookie') || '';

  const form = new FormData();
  form.append('requestId', `smoke-${Date.now()}`);
  form.append('to', JSON.stringify([{ email: to }]));
  form.append('subject', `TNA Business Email Smoke Test ${new Date().toISOString().slice(0, 19)}`);
  form.append('bodyText', 'This is an API integration smoke test via the real /api/email/send pipeline.\n\nParagraph two.');
  form.append('bodyHtml', '<p>This is an API integration smoke test via the real <code>/api/email/send</code> pipeline.</p><p>Paragraph two.</p>');

  if (file) {
    const fs = await import('fs');
    const buffer = fs.readFileSync(file);
    const blob = new Blob([buffer]);
    form.append('attachments', blob, file.split('/').pop());
  }

  const sendRes = await fetch(`${appUrl}/api/email/send`, {
    method: 'POST',
    headers: { Cookie: cookies },
    body: form,
  });

  const result = await sendRes.json();
  console.log('HTTP Status:', sendRes.status);
  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ API SMOKE TEST PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ API SMOKE TEST FAILED');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
