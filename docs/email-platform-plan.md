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

## Deployment Readiness

### Required DNS Records (Cloudflare)
| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `mail` | `139.180.175.60` | DNS-only (grey cloud) |
| MX | `@` | `10 mail.tnaprovider.com.au` | — |
| TXT | `@` | `v=spf1 mx a:mail.tnaprovider.com.au include:_spf.mail.tnaprovider.com.au ~all` | — |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@tnaprovider.com.au; pct=100` | — |
| TXT | `default._domainkey` | Generated after Stalwart deploy | — |
| PTR | VPS IP | `mail.tnaprovider.com.au` | Via Vultr support |

### Required Env Vars (platform `.env`)
```env
MAIL_PROVIDER=imap-smtp
MAIL_IMAP_HOST=mail.tnaprovider.com.au
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true
MAIL_IMAP_USER=info@tnaprovider.com.au
MAIL_IMAP_PASS=<mailbox-password>
MAIL_SMTP_HOST=mail.tnaprovider.com.au
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=info@tnaprovider.com.au
MAIL_SMTP_PASS=<mailbox-password>
MAIL_DEFAULT_MAILBOX=info@tnaprovider.com.au
MAIL_ALLOWED_MAILBOXES=info@tnaprovider.com.au,projects@tnaprovider.com.au,accounts@tnaprovider.com.au
MAIL_ALLOW_HEADER_MAILBOX=false
```

### Required Env Vars (Stalwart `.env`)
```env
MAIL_DOMAIN=tnaprovider.com.au
MAIL_HOSTNAME=mail.tnaprovider.com.au
MAIL_ADMIN_EMAIL=admin@tnaprovider.com.au
MAIL_ADMIN_PASSWORD=<strong-admin-password>
```

### Deployment Steps
1. **Test port 25** on VPS: `nc -v smtp.gmail.com 25` — if blocked, stop.
2. **Open firewall**: `ufw allow 25/tcp 587/tcp 993/tcp 443/tcp 465/tcp`
3. **Clone repo on VPS**: `git clone https://github.com/nguyenhhluong/tnaprovider.git`
4. **Configure Stalwart**: `cd infra/mail/stalwart && cp .env.example .env && nano .env`
5. **Start Stalwart**: `docker compose up -d`
6. **Provision TLS**: `certbot certonly --standalone -d mail.tnaprovider.com.au`, copy certs to Stalwart volume
7. **Create domain + mailboxes** (info, projects, accounts, admin)
8. **Generate DKIM key** in Stalwart CLI, add TXT record to Cloudflare
9. **Add A, MX, SPF, DMARC records** in Cloudflare (mail subdomain DNS-only)
10. **Request PTR record** from Vultr support
11. **Update platform `.env`** with IMAP/SMTP credentials, set `MAIL_PROVIDER=imap-smtp`
12. **Run Gmail send/receive tests**

### Gmail Test Plan
1. Send Gmail → `info@tnaprovider.com.au`, verify in platform UI inbox
2. Open message, check subject/body display
3. Mark read/unread, verify state persists
4. Move to archive/trash, verify folder change
5. Reply from platform UI → `your@gmail.com`, verify Gmail receives
6. Check sent folder in portal shows sent message
7. In Gmail original message view: verify SPF=pass, DKIM=pass

### Security Checks
- `.env` files never committed (gitignored)
- No mail credentials in frontend code
- `MAIL_ALLOW_HEADER_MAILBOX=false` in production
- Auth middleware uses server-side `MAIL_DEFAULT_MAILBOX`
- HTML emails sanitized before rendering (DOMPurify)
- All mail operations logged via audit system

### Rollback Plan
```bash
cd tnaprovider/infra/mail/stalwart
docker compose down
# Restore from backup:
tar -xzf /backups/mail-YYYYMMDD.tar.gz -C /opt/stalwart-data
docker compose up -d
# Verify: docker compose logs -f, test IMAP
```

### Blockers
- Port 25 outbound status unknown on Vultr VPS
- PTR/rDNS record not yet requested
- Let's Encrypt TLS cert not provisioned
- Mailbox passwords not yet generated
- Gmail send/receive not tested
