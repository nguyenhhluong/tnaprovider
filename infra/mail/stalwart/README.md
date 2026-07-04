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
# If timeout/fail → port 25 blocked by Vultr → STOP, use Mailu as fallback or contact Vultr
```

## Step 2 — Open Firewall
```bash
ufw allow 25/tcp
ufw allow 587/tcp
ufw allow 993/tcp
ufw allow 443/tcp
ufw allow 465/tcp
ufw allow 4190/tcp
ufw reload
```

## Step 3 — Clone and Configure
```bash
git clone https://github.com/nguyenhhluong/tnaprovider.git
cd tnaprovider/infra/mail/stalwart
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

## Step 5 — Provision TLS (Let's Encrypt)
```bash
# Install certbot on the host (not inside the container)
apt install certbot
certbot certonly --standalone -d mail.tnaprovider.com.au

# Copy certs to Stalwart data volume
docker cp /etc/letsencrypt/live/mail.tnaprovider.com.au/fullchain.pem stalwart-mail:/opt/stalwart-data/certs/
docker cp /etc/letsencrypt/live/mail.tnaprovider.com.au/privkey.pem stalwart-mail:/opt/stalwart-data/certs/
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
| TXT | `@` | `v=spf1 mx a:mail.tnaprovider.com.au include:_spf.mail.tnaprovider.com.au ~all` | — |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@tnaprovider.com.au; pct=100` | — |
| TXT | `default._domainkey` | (from step 7) | — |

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
If Stalwart deployment fails (port 25 blocked, compatibility issue, etc.), use Mailu:
```bash
cd ../mailu
cp .env.example .env
nano .env
docker compose up -d
```
DNS records are identical. Mailu provides Roundcube webmail at `https://mail.tnaprovider.com.au/webmail`.

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
