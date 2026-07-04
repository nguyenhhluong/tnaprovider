# Mailu Mail Server — TNA Provider (Fallback)

## Overview
Mailu is a Docker-based mail server suite. This is the fallback option if Stalwart deployment is blocked.

## When to Use Mailu
- Stalwart has a compatibility or configuration issue with the VPS environment
- You want a built-in webmail UI (Roundcube)

**Note**: Mailu does NOT fix port 25 being blocked. Both Stalwart and Mailu require outbound port 25 for external email delivery. If port 25 is blocked by Vultr, neither server can relay to external addresses — a third-party SMTP relay is needed regardless of server choice.

## Differences from Stalwart
- More services to manage (front, imap, smtp, antispam, webmail, admin)
- Includes Roundcube webmail built in
- REST admin API on port 8080
- Higher resource usage than Stalwart

## Deployment Steps

### Step 1 — Port 25 Check
```bash
ssh root@139.180.175.60
nc -v smtp.gmail.com 25
```
If blocked, Mailu still works for local delivery but SMTP relay to external addresses will fail.

### Step 2 — Open Firewall
```bash
# Mail ports only. Port 443 is handled by Caddy.
ufw allow 25/tcp
ufw allow 587/tcp
ufw allow 993/tcp
ufw allow 465/tcp
ufw reload
```

### Step 3 — Navigate to Existing Repo
```bash
cd /root/tnaprovider
git fetch origin --prune
git checkout feature/phase-3-business-platform

cd infra/mail/mailu
cp .env.example .env
nano .env
```
Required `.env` values:
```env
DOMAIN=tnaprovider.com.au
HOSTNAME=mail.tnaprovider.com.au
ADMIN_EMAIL=admin@tnaprovider.com.au
ADMIN_PASSWORD=<strong-password>
TLS_FLAVOR=cert
```

### Step 4 — Start Mailu
```bash
docker compose up -d
docker compose logs -f
```

### Step 5 — TLS and Caddy
Same architecture as Stalwart: Caddy terminates HTTPS for `mail.tnaprovider.com.au` and reverse proxies to Mailu's internal HTTP port. Mailu's `front` service exposes port 80 internally — configure Caddy to proxy to `127.0.0.1:80` (or Mailu's nginx container IP on the Docker network).

Mailu's `docker-compose.yml` binds port 443 directly — for same-VPS deployment with Caddy, either:
- Remove the `443:443` mapping from `front` service (Caddy handles HTTPS), or
- Change Mailu to use a different internal port

### Step 6 — Create Mailboxes
Browse to `https://mail.tnaprovider.com.au/admin` (or internally via `http://127.0.0.1:8080`) and log in with the admin account. Create mailboxes:
- `info@tnaprovider.com.au`
- `projects@tnaprovider.com.au`
- `accounts@tnaprovider.com.au`

### Step 7 — DNS Records
Same as Stalwart — see `docs/email-dns-checklist.md`:
| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `mail` | `139.180.175.60` | DNS-only |
| MX | `@` | `10 mail.tnaprovider.com.au` | — |
| TXT | `@` | SPF | — |
| TXT | `_dmarc` | DMARC | — |
| TXT | DKIM selector | From Mailu admin UI | — |

### Step 8 — Update Platform .env
Same as Stalwart — set `MAIL_PROVIDER=imap-smtp` with the Mailu IMAP/SMTP credentials.

## Backup
```bash
# Mailu stores everything under the docker volume mailu-data
docker run --rm -v mailu-data:/data -v /backups:/backups alpine tar -czf /backups/mailu-$(date +%Y%m%d).tar.gz -C /data .
```

## Rollback to Stalwart
If you start with Mailu and later want Stalwart:
1. Export all mailboxes (IMAP sync)
2. Deploy Stalwart (see `../stalwart/README.md`)
3. Import mailboxes
4. Update platform `.env` to point at Stalwart
5. DNS records stay the same

## Troubleshooting
```bash
# Check all service logs
docker compose logs -f

# Test SMTP
nc -v mail.tnaprovider.com.au 25

# Access admin UI
curl http://localhost:8080

# Access webmail
curl https://mail.tnaprovider.com.au/webmail
```
