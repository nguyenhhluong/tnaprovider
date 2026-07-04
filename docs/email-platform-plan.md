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
- Stalwart docker-compose.yml and configuration

### What Is Mock/Fallback
- Mail server not yet deployed (requires VPS with port 25)
- DNS records not yet configured
- Frontend runs in `VITE_EMAIL_MOCK_MODE=true` until deployment
- Roundcube fallback available via `https://mail.tnaprovider.com.au/webmail`

### Backup Mail Server Option: Mailu
- Docker-based mail server suite
- Included IMAP/SMTP, webmail, admin UI, spam filtering
- DKIM/SPF/DMARC support
- REST API for management
- Fallback if Stalwart deployment is blocked
