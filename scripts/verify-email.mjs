import 'dotenv/config';
import nodemailer from 'nodemailer';

async function verify() {
  const host = process.env.ZOHO_SMTP_HOST;
  const port = parseInt(process.env.ZOHO_SMTP_PORT || '465', 10);
  const secure = process.env.ZOHO_SMTP_SECURE !== 'false';
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASSWORD;

  if (!host) {
    console.error('ZOHO_SMTP_HOST is not configured');
    process.exit(1);
  }

  if (!user) {
    console.error('ZOHO_SMTP_USER is not configured');
    process.exit(1);
  }

  if (!pass) {
    console.error('ZOHO_SMTP_PASSWORD is not configured');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: false,
  });

  try {
    const success = await transporter.verify();
    if (success) {
      console.log('SMTP connection verified successfully');
      console.log(`Host: ${host}`);
      console.log(`Port: ${port}`);
      console.log(`Secure: ${secure}`);
      console.log(`User: ${user}`);
      process.exit(0);
    } else {
      console.error('SMTP verification returned false');
      process.exit(1);
    }
  } catch (err) {
    console.error('SMTP verification failed:', err.message);
    process.exit(1);
  }
}

verify();
