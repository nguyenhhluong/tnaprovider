import 'dotenv/config';
import { ImapFlow } from 'imapflow';

async function verify() {
  const host = process.env.ZOHO_IMAP_HOST;
  const port = parseInt(process.env.ZOHO_IMAP_PORT || '993', 10);
  const secure = process.env.ZOHO_IMAP_SECURE !== 'false';
  const user = process.env.ZOHO_IMAP_USER;
  const pass = process.env.ZOHO_IMAP_PASSWORD;

  if (!host) {
    console.error('ZOHO_IMAP_HOST is not configured');
    process.exit(1);
  }

  if (!user) {
    console.error('ZOHO_IMAP_USER is not configured');
    process.exit(1);
  }

  if (!pass) {
    console.error('ZOHO_IMAP_PASSWORD is not configured');
    process.exit(1);
  }

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await client.connect();
    console.log('IMAP connection established successfully');
    console.log(`Host: ${host}`);
    console.log(`Port: ${port}`);
    console.log(`Secure: ${secure}`);
    console.log(`User: ${user}`);

    const mailboxes = await client.list();
    console.log(`\nFolders: ${mailboxes.length}`);
    for (const mb of mailboxes) {
      console.log(`  - ${mb.name}${mb.specialUse ? ` (${mb.specialUse})` : ''}`);
    }

    const inbox = await client.mailboxOpen('INBOX');
    console.log(`\nInbox: ${inbox.exists} messages, ${inbox.unseen} unseen`);

    await client.logout();
    console.log('\nIMAP verification completed successfully');
    process.exit(0);
  } catch (err) {
    const responseText = err.responseText || err.message;
    console.error(`IMAP connection failed: ${responseText}`);
    if (responseText.includes('enable IMAP')) {
      console.error('\nACTION REQUIRED: IMAP is not enabled for this Zoho account.');
      console.error('To enable IMAP:');
      console.error('  1. Log in to Zoho Mail at https://mail.zoho.com.au');
      console.error('  2. Go to Settings → Mail Accounts → IMAP Access');
      console.error('  3. Enable IMAP Access and save');
      console.error('  4. Retry this verification');
    }
    process.exit(1);
  }
}

verify();
