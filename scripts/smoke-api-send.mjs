import 'dotenv/config';

async function main() {
  const args = process.argv.slice(2);
  const to = args.find(a => a.startsWith('--to='))?.split('=')[1];
  const file = args.find(a => a.startsWith('--attach='))?.split('=')[1];

  if (!to) {
    console.error('Usage: node scripts/smoke-api-send.mjs --to=real@address.com [--attach=./file.pdf]');
    process.exit(1);
  }

  // Login
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SMOKE_EMAIL || 'admin@tnaprovider.com', password: process.env.SMOKE_PASSWORD || 'AdminPass123!' }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    process.exit(1);
  }
  const cookies = loginRes.headers.get('set-cookie') || '';

  const form = new FormData();
  form.append('requestId', `smoke-${Date.now()}`);
  form.append('to', JSON.stringify([{ email: to }]));
  form.append('subject', `TNA Business Email API Smoke Test ${new Date().toISOString().slice(0, 19)}`);
  form.append('bodyText', 'This is an API integration smoke test.\n\nParagraph two.');
  form.append('bodyHtml', '<p>This is an API integration smoke test.</p><p>Paragraph two.</p>');

  if (file) {
    const fs = await import('fs');
    const buffer = fs.readFileSync(file);
    const blob = new Blob([buffer]);
    form.append('attachments', blob, file.split('/').pop());
  }

  const sendRes = await fetch('http://127.0.0.1:3000/api/email/send', {
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

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
