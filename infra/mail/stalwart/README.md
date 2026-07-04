# Stalwart Mail Server — TNA Provider

## Server Requirements
- 1 vCPU (2 vCPU recommended)
- 2 GB RAM (4 GB recommended)
- 20 GB SSD for mail storage
- Static public IP with PTR record
- Port 25 outbound unblocked

## DNS Setup
See `docs/email-dns-checklist.md` for full DNS instructions.

Required records before deployment:
- A record: `mail.tnaprovider.com.au` -> VPS IP (DNS only, no Cloudflare proxy)
- MX record: `tnaprovider.com.au` -> `mail.tnaprovider.com.au`
- SPF, DKIM, DMARC TXT records
- PTR/rDNS from VPS provider

## Step 1 — Test Port 25
Before anything, verify the VPS provider allows port 25:
```bash
ssh root@139.180.175.60
nc -v smtp.gmail.com 25
# If connection succeeds → port 25 open, proceed
# If timeout/fail → port 25 blocked by Vultr → STOP.
# Stalwart and Mailu both cannot relay externally if port 25 is blocked.
# Fix requires Vultr port 25 unblock or third-party SMTP relay.
```

## Step 2 — Open Firewall
```bash
# Mail ports only. Port 443 is handled by Caddy (already open for the website).
ufw allow 25/tcp
ufw allow 587/tcp
ufw allow 993/tcp
ufw allow 465/tcp
ufw allow 4190/tcp
ufw reload
```

## Step 3 — Navigate to Existing Repo
The repo is already deployed on the VPS by Dev 1's integration branch work.
```bash
cd /root/tnaprovider
git status
git fetch origin --prune
# Use the currently approved deployed branch only.
# Do not switch the live website repo to a feature branch during mail deployment.
```
**Warning**: Mail deployment files must be merged into the approved deployment branch before production mail deployment. Do not deploy mail from `feature/phase-3-business-platform` directly on the live VPS.

Then configure Stalwart:
```bash
cd infra/mail/stalwart
cp .env.example .env
nano .env
```
Required `.env` values:
```
MAIL_DOMAIN=tnaprovider.com.au
MAIL_HOSTNAME=mail.tnaprovider.com.au
MAIL_ADMIN_EMAIL=admin@tnaprovider.com.au
MAIL_ADMIN_PASSWORD=<strong-random-password>
```

## Step 4 — Start Stalwart
```bash
docker compose up -d
docker compose logs -f
# Wait for "listening on port 25" messages
```

## Step 5 — TLS Architecture

### HTTPS/web (Caddy handles this)
The production VPS already runs Caddy on public ports 80/443. Caddy terminates TLS for all web traffic including `mail.tnaprovider.com.au`. Add this to the existing Caddyfile:

```caddyfile
mail.tnaprovider.com.au {
    reverse_proxy 127.0.0.1:8080
}
```

Port 8080 is Stalwart's internal HTTP listener for the admin UI and JMAP API. Caddy handles TLS automatically via ACME. No standalone Certbot needed.

### SMTP/IMAP TLS (Stalwart needs certs separately)
Stalwart needs TLS certificates for STARTTLS on ports 25/587 and TLS on ports 993/465. Options:

**Option A (recommended)**: Copy Caddy's managed certificate from Caddy's cert storage to a shared volume that Stalwart can read. Caddy auto-renews, and a cron job copies the renewed cert.

**Option B**: Use Stalwart's built-in ACME client with DNS challenge (avoids port 80 conflict with Caddy).

**Option C**: Obtain a cert manually via DNS challenge and mount it into the Stalwart container.

Update `docker-compose.yml` TLS env vars to point at the chosen cert path:
```
STALWART_TLS_CERT=/opt/stalwart-data/certs/fullchain.pem
STALWART_TLS_PRIVATE_KEY=/opt/stalwart-data/certs/privkey.pem
```

## Step 6 — Create Domain and Mailboxes
```bash
docker exec -it stalwart-mail stalwart-cli

# Inside the CLI:
server domain create tnaprovider.com.au

server mailbox create info@tnaprovider.com.au --password "<strong-password>" --display-name "TNA Info"
server mailbox create projects@tnaprovider.com.au --password "<strong-password>" --display-name "TNA Projects"
server mailbox create accounts@tnaprovider.com.au --password "<strong-password>" --display-name "TNA Accounts"
server mailbox create admin@tnaprovider.com.au --password "<strong-password>" --display-name "TNA Admin"

# Verify
server mailbox list
```

## Step 7 — Generate DKIM
```bash
# Inside stalwart-cli:
server dkim generate tnaprovider.com.au --selector default
server dkim export tnaprovider.com.au --selector default
# Copy the public key and add as TXT record:
# default._domainkey.tnaprovider.com.au TXT "v=DKIM1; k=rsa; p=<PUBLIC_KEY>"
```

## Step 8 — Add DNS Records (Cloudflare)
Add these records to the `tnaprovider.com.au` zone:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `mail` | `139.180.175.60` | DNS-only (grey cloud) |
| MX | `@` | `10 mail.tnaprovider.com.au` | — |
| TXT | `@` | `v=spf1 mx a ip4:139.180.175.60 ~all` | — |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@tnaprovider.com.au; pct=100` | — |
| TXT | `default._domainkey` | (from step 7) | — |

Note: `dmarc-reports@tnaprovider.com.au` must exist before enabling `rua` reports, or omit `rua` until the mailbox is ready.

Critical: `mail.tnaprovider.com.au` must be **DNS-only** (grey cloud). Email ports do not work through Cloudflare proxy.

## Step 9 — Request PTR/rDNS
Open a support ticket with your VPS provider (Vultr) requesting:
```
PTR record for 139.180.175.60 -> mail.tnaprovider.com.au
```

## Step 10 — Update Platform .env
On the development machine (not the VPS), update the platform root `.env`:
```env
MAIL_PROVIDER=imap-smtp
MAIL_IMAP_HOST=mail.tnaprovider.com.au
MAIL_IMAP_PORT=993
MAIL_IMAP_USER=info@tnaprovider.com.au
MAIL_IMAP_PASS=<info-mailbox-password>
MAIL_SMTP_HOST=mail.tnaprovider.com.au
MAIL_SMTP_PORT=587
MAIL_SMTP_USER=info@tnaprovider.com.au
MAIL_SMTP_PASS=<info-mailbox-password>
MAIL_DEFAULT_MAILBOX=info@tnaprovider.com.au
MAIL_ALLOWED_MAILBOXES=info@tnaprovider.com.au,projects@tnaprovider.com.au,accounts@tnaprovider.com.au
MAIL_ALLOW_HEADER_MAILBOX=false
VITE_EMAIL_MOCK_MODE=false
```
Restart: `npm run server`

## Step 11 — Gmail Test
```bash
# Send Gmail -> info@tnaprovider.com.au, check Stalwart logs
docker compose logs -f | grep "accepted"

# Open platform email UI, check inbox for the Gmail message
# Reply to Gmail, verify Gmail receives
# Check sent folder in platform UI
```

## Backup Commands
```bash
# Manual backup
docker exec stalwart-mail stalwart-cli backup /backups/mail-$(date +%Y%m%d).tar.gz

# Automated daily backup (add to crontab)
0 2 * * * docker exec stalwart-mail stalwart-cli backup /backups/mail-$(date +\%Y\%m\%d).tar.gz && find /backups -name "mail-*.tar.gz" -mtime +30 -delete
```

## Restore Commands
```bash
# Stop the server
docker compose down

# Restore data directory
tar -xzf /backups/mail-20260704.tar.gz -C /opt/stalwart-data

# Restart
docker compose up -d
```

## Upgrade Commands
```bash
# Pull latest image
docker compose pull

# Recreate container
docker compose up -d --force-recreate

# Verify
docker compose logs -f
```

## Rollback to Specific Version
```bash
docker compose down
# Edit docker-compose.yml to pin version: stalwartlabs/mail-server:0.9.0
docker compose up -d
```

## Mailu Fallback
If Stalwart deployment fails due to compatibility or configuration issues, use Mailu:
```bash
cd /root/tnaprovider/infra/mail/mailu
cp .env.example .env
nano .env
docker compose up -d
```
DNS records are identical. Mailu provides Roundcube webmail at `https://mail.tnaprovider.com.au/webmail`.

**Note**: Mailu does NOT fix port 25 being blocked. Both servers require outbound port 25 for external delivery.

## Caddy Reverse Proxy (Quick Reference)
Add to your existing Caddyfile (typically `/etc/caddy/Caddyfile` or managed via Caddy API):
```caddyfile
mail.tnaprovider.com.au {
    reverse_proxy 127.0.0.1:8080
}
```
Then reload Caddy: `caddy reload` or `systemctl reload caddy`.

Port `8080` is Stalwart's internal HTTP listener for the admin UI and JMAP API. It is not exposed publicly — only Caddy can reach it via loopback.

## Troubleshooting
```bash
# Check logs
docker compose logs -f

# Test SMTP
nc -v mail.tnaprovider.com.au 25

# Test IMAP
openssl s_client -connect mail.tnaprovider.com.au:993

# Verify DNS
dig mail.tnaprovider.com.au A +short
dig tnaprovider.com.au MX +short

# Check SPF/DKIM/DMARC
dig tnaprovider.com.au TXT +short
dig default._domainkey.tnaprovider.com.au TXT +short
dig _dmarc.tnaprovider.com.au TXT +short

# Test mail delivery from VPS
echo "Test email body" | mail -s "Test Subject" info@tnaprovider.com.au
```
