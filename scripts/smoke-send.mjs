import 'dotenv/config';
import nodemailer from 'nodemailer';

async function main() {
  const args = process.argv.slice(2);
  const to = args.find(a => a.startsWith('--to='))?.split('=')[1];
  
  if (!to) {
    console.error('Usage: node scripts/smoke-send.mjs --to=recipient@example.com');
    process.exit(1);
  }

  const host = process.env.ZOHO_SMTP_HOST;
  const port = parseInt(process.env.ZOHO_SMTP_PORT || '465', 10);
  const secure = process.env.ZOHO_SMTP_SECURE !== 'false';
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASSWORD;
  const fromName = process.env.EMAIL_FROM_NAME || 'TNA Provider';
  const fromAddr = process.env.EMAIL_FROM_ADDRESS || 'info@tnaprovider.com.au';

  if (!host || !pass) {
    console.error('SMTP is not configured. Check ZOHO_SMTP_HOST and ZOHO_SMTP_PASSWORD.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
  });

  const timestamp = new Date().toISOString().replace(/[TZ:]/g, '-').slice(0, 19);
  const subject = `TNA Business Email Smoke Test ${timestamp}`;
  
  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to,
      subject,
      text: `This is a smoke test from the TNA Provider Business Email system.\n\nSent at: ${timestamp}\n\nIf you receive this, the SMTP send pipeline is working.`,
      html: `<p>This is a smoke test from the <strong>TNA Provider</strong> Business Email system.</p><p>Sent at: ${timestamp}</p><p>If you receive this, the SMTP send pipeline is working.</p>`,
    });

    console.log('SMTP Smoke Test: SUCCESS');
    console.log('Message-ID:', info.messageId);
    console.log('Accepted:', info.accepted?.join(', ') || 'N/A');
    console.log('Rejected:', info.rejected?.join(', ') || 'N/A');
    process.exit(0);
  } catch (err) {
    console.error('SMTP Smoke Test: FAILED');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
