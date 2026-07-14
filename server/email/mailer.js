import nodemailer from 'nodemailer';

let transporter = null;
let transporterResolve = null;
let transporterPromise = null;

function getZohoConfig() {
  return {
    host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com.au',
    port: parseInt(process.env.ZOHO_SMTP_PORT || '465', 10),
    secure: process.env.ZOHO_SMTP_SECURE !== 'false',
    user: process.env.ZOHO_SMTP_USER || 'info@tnaprovider.com.au',
    pass: process.env.ZOHO_SMTP_PASSWORD || '',
    fromName: process.env.EMAIL_FROM_NAME || 'TNA Provider',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'info@tnaprovider.com.au',
  };
}

function buildTransporter() {
  const config = getZohoConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
  });
}

function getTransporter() {
  if (transporter) return transporter;
  if (transporterPromise) return transporterPromise;
  transporterPromise = (async () => {
    const tr = buildTransporter();
    transporter = tr;
    return tr;
  })();
  return transporterPromise;
}

export async function verifyEmailConnection() {
  try {
    const tr = await getTransporter();
    const success = await tr.verify();
    console.log('[mailer] SMTP connection verified successfully');
    return success;
  } catch (err) {
    console.error('[mailer] SMTP connection verification failed:', err.message);
    return false;
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}) {
  const config = getZohoConfig();
  const tr = await getTransporter();

  const mailOptions = {
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text,
  };

  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  console.log('[mailer] Sending email:', {
    to: mailOptions.to,
    subject: mailOptions.subject,
    from: mailOptions.from,
    replyTo: mailOptions.replyTo || undefined,
  });

  try {
    const info = await tr.sendMail(mailOptions);
    console.log('[mailer] Email sent successfully:', {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });
    return { messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] Failed to send email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      error: err.message,
    });
    throw err;
  }
}
