# TNA Provider — Email Platform Plan

## Selected Mail Server: Stalwart Mail Server

### Reason for Selection
- All-in-one mail server: SMTP, IMAP, POP3, JMAP
- Built-in admin UI, anti-spam, DKIM/SPF/DMARC support
- TLS and Docker support out of the box
- JMAP provides a modern HTTP-based mail API path
- Active open-source community
- Single binary deployment, low resource usage

### Required DNS Records
See [email-dns-checklist.md](./email-dns-checklist.md) for full details.

### Required Ports
| Port | Service | Purpose |
|------|---------|---------|
| 25 | SMTP | Server-to-server email relay |
| 587 | SMTP Submission | Authenticated client submission |
| 993 | IMAPS | Secure IMAP for mail clients |
| 443 | HTTPS | Admin UI, JMAP API, Webmail |
| 465 | SMTPS (optional) | Alternative SMTP submission |
| 4190 | ManageSieve (optional) | Sieve filter management |

### Required Server Resources
- 1 vCPU (2 vCPU recommended)
- 2 GB RAM minimum (4 GB recommended)
- 20 GB SSD minimum for mail storage
- Static public IP address
- Reverse DNS (PTR) record configured
- Port 25 outbound unblocked by VPS provider

### Architecture
```
[tna-provider-react-frontend]
        |
        | HTTPS (REST API calls)
        |
[backend-express-server.js]
        |
        | JMAP / Admin API / SMTP (server-side only)
        |
[stalwart-mail-server]
        |
        | SMTP (port 25) ---> External mail servers
        | IMAP (port 993)    Internal IMAP access (admin only)
        | JMAP (port 443)   Internal JMAP API (from backend)
```

### How Platform Connects to Mail Server
1. User interacts with React email UI at `/platform/email`
2. React calls `src/utils/emailApi.ts` functions
3. `emailApi.ts` makes REST calls to backend at `/api/email/*`
4. Backend Express server authenticates the platform user
5. Backend connects to Stalwart via JMAP API using admin credentials
6. Backend maps platform user to mailbox, performs mail operations
7. No mail credentials are ever exposed to the browser

### Security Plan
- All mail API endpoints require platform authentication
- Backend checks mailbox permissions before any operation
- SMTP/IMAP credentials stored only in server `.env`
- HTML email sanitised before rendering (strip scripts, event handlers)
- Attachments require auth before download
- Rate limiting on send endpoint
- Audit logging for all mail actions
- No credentials in frontend bundle or localStorage

### Backup Plan
- Daily mail store backup via cron job
- Backup command: `docker exec stalwart stalwart-cli --data /opt/stalwart-data backup /backups/mail-$(date +%Y%m%d).tar.gz`
- Backup retention: 30 days
- Database export for user/mailbox config

### Rollback Plan
1. Stop Stalwart: `docker compose -f infra/mail/stalwart/docker-compose.yml down`
2. Restore data directory from backup
3. Restart: `docker compose -f infra/mail/stalwart/docker-compose.yml up -d`
4. Verify: Check mail delivery, IMAP connection, JMAP API

### What Is Real Now
- Email types and audit models
- Frontend email UI with mock data fallback
- Backend email API routes (with `/api/email/*` endpoints)
- Email API adapter with real+fallback modes
- Mail server deployment files prepared (Stalwart primary, Mailu fallback)
- SMTP connector via nodemailer (ready when `MAIL_PROVIDER=smtp` and SMTP credentials configured)

### What Is Mock/Fallback
- Mail server deployment prepared but **not yet live** on VPS (requires port 25 confirmation, Docker deployment, DNS records)
- DNS records (A, MX, SPF, DKIM, DMARC, PTR) not yet configured
- Frontend runs in `VITE_EMAIL_MOCK_MODE=true` (default) until mail server is deployed
- Backend runs with `MAIL_PROVIDER=mock` (default) until SMTP credentials are configured
- Attachments blocked in non-mock mode until multipart/FormData upload is implemented
- Stalwart docker-compose.yml and configuration ready for deployment

### Backup Mail Server Option: Mailu
- Docker-based mail server suite
- Included IMAP/SMTP, webmail, admin UI, spam filtering
- DKIM/SPF/DMARC support
- REST API for management
- Fallback if Stalwart deployment is blocked

---

## Phase 2: Zoho Mail SMTP (Transactional Emails)

Zoho Mail Australia SMTP is used for automated transactional emails (quote confirmations, admin notifications, user invitations, password resets).

### Required Environment Variables

| Variable | Value |
|----------|-------|
| `ZOHO_SMTP_HOST` | `smtp.zoho.com.au` |
| `ZOHO_SMTP_PORT` | `465` |
| `ZOHO_SMTP_SECURE` | `true` |
| `ZOHO_SMTP_USER` | `info@tnaprovider.com.au` |
| `ZOHO_SMTP_PASSWORD` | (Zoho app password) |
| `EMAIL_FROM_NAME` | `TNA Provider` |
| `EMAIL_FROM_ADDRESS` | `info@tnaprovider.com.au` |
| `ADMIN_EMAIL` | `info@tnaprovider.com.au` |
| `APP_URL` | `https://tnaprovider.com.au` |

### How to Generate a Zoho App Password

1. Log in to your Zoho Mail account at https://mail.zoho.com.au
2. Go to Settings → Account → App Passwords
3. Generate a new app password for "TNA Provider SMTP"
4. Copy the generated password and set it as `ZOHO_SMTP_PASSWORD`

### SMTP Verification

```bash
npm run email:verify
```

This command tests the SMTP connection without sending an email.

### Email Types

| Type | Purpose |
|------|---------|
| `QUOTE_RECEIVED_CUSTOMER` | Confirmation sent to customer after quote request |
| `QUOTE_RECEIVED_ADMIN` | Notification sent to admin when new quote arrives |
| `USER_INVITATION` | Invitation email for new user account |
| `PASSWORD_RESET` | Password reset link email |
| `QUOTE_STATUS_CHANGED` | Notification when quote status is updated (sent/accepted/rejected/expired) |

### How to Test Quote Emails

1. Submit a quote request via the contact form (POST /api/contact)
2. Check the email_jobs table for delivery status
3. For development, use the email preview endpoint:
   ```
   GET /dev/email-preview/quote-confirmation
   GET /dev/email-preview/new-quote-admin
   ```

### How to Test Account Invitations

1. Log in as an admin and invite a user via POST /api/platform/users/invite
2. In non-production mode, the API returns `devToken` for testing
3. Use the devToken with POST /api/auth/accept-invite to complete the flow

### Email Retry Behaviour

- Failed email jobs can be retried via `POST /api/admin/email-jobs/:id/retry`
- Retry increments attempt_count and preserves the original business record
- Already-sent jobs cannot be retried (returns 400)
- Successful jobs are never retried accidentally

### Delivery Logs in Admin

- `GET /api/admin/email-jobs` — list all email jobs with status filters
- `GET /api/admin/email-jobs/:id` — view single job details
- `GET /api/admin/email-delivery-status/:entityType/:entityId` — view delivery status per business record
