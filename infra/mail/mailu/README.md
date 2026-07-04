# Mailu Mail Server — TNA Provider (Fallback)

## Overview
Mailu is a Docker-based mail server suite. This is the fallback option if Stalwart deployment is blocked.

## Usage
```bash
cd infra/mail/mailu
cp .env.example .env
# Edit .env with real values
docker compose up -d
```

## Differences from Stalwart
- More services to manage (front, imap, smtp, antispam, webmail, admin)
- Includes Roundcube webmail built in
- REST admin API on port 8080
- Higher resource usage than Stalwart

## DNS
Same requirements as Stalwart — see `docs/email-dns-checklist.md`.
