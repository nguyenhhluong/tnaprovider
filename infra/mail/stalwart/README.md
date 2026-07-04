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

## Firewall Ports
```bash
# Allow mail ports
ufw allow 25/tcp
ufw allow 587/tcp
ufw allow 993/tcp
ufw allow 443/tcp
ufw allow 465/tcp
ufw allow 4190/tcp
```

## Install Commands
```bash
# Clone the repo on the mail VPS
git clone https://github.com/nguyenhhluong/tnaprovider.git
cd tnaprovider/infra/mail/stalwart

# Copy and edit .env
cp .env.example .env
# Edit .env with real values
nano .env

# Start mail server
docker compose up -d

# Check logs
docker compose logs -f

# Verify server is running
curl https://mail.tnaprovider.com.au/status
```

## Create Mailbox Commands
```bash
# Connect to the container
docker exec -it stalwart-mail stalwart-cli

# Inside the CLI:
# Create domain
server domain create tnaprovider.com.au

# Create mailboxes
server mailbox create info@tnaprovider.com.au --password "strong-password" --display-name "TNA Info"
server mailbox create admin@tnaprovider.com.au --password "strong-password" --display-name "TNA Admin"
server mailbox create projects@tnaprovider.com.au --password "strong-password" --display-name "TNA Projects"
server mailbox create accounts@tnaprovider.com.au --password "strong-password" --display-name "TNA Accounts"
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

## Rollback Commands
```bash
# Downgrade to specific version
docker compose down
# Edit docker-compose.yml to pin version: stalwartlabs/mail-server:0.9.0
docker compose up -d
```

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

# Test mail delivery
echo "Test email body" | mail -s "Test Subject" info@tnaprovider.com.au
```
