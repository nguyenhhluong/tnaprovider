# TNA Provider — One-Command VPS Installer

Deploy TNA Provider on a fresh Ubuntu/Debian VPS with one command.
Includes automatic Cloudflare DNS record management.

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhhluong/tnaprovider/main/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

## With Cloudflare DNS Automation

```bash
sudo CLOUDFLARE_API_TOKEN=xxxxx \
     CLOUDFLARE_ZONE_NAME=tnaprovider.com.au \
     ./install.sh --yes
```

## Non-Interactive Mode

```bash
sudo TNA_DOMAIN=tnaprovider.com.au \
     TNA_APP_DOMAIN=app.tnaprovider.com.au \
     TNA_REPO=https://github.com/nguyenhhluong/tnaprovider.git \
     TNA_BRANCH=main \
     TNA_INSTALL_DIR=/opt/tnaprovider \
     TNA_APP_USER=tnaprovider \
     TNA_PORT=3000 \
     TNA_HOST=127.0.0.1 \
     CLOUDFLARE_API_TOKEN=xxxxx \
     CLOUDFLARE_ZONE_NAME=tnaprovider.com.au \
     ./install.sh --yes
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--yes` | Non-interactive mode | off |
| `--dry-run` | Show actions without making changes | off |
| `--skip-cloudflare` | Skip Cloudflare DNS setup | off |
| `--skip-tests` | Skip running test suites after build | off |
| `--force-env` | Overwrite existing .env if present | off |
| `--force-existing` | Allow running on existing production server | off |
| `--branch <name>` | Git branch to deploy | main |
| `--domain <name>` | Primary domain | tnaprovider.com.au |
| `--app-domain <name>` | App subdomain | app.tnaprovider.com.au |
| `--install-dir <path>` | Install directory | /opt/tnaprovider |
| `--port <num>` | App listen port | 3000 |
| `--user <name>` | System user for app | tnaprovider |
| `--cloudflare-proxied <bool>` | Cloudflare proxy mode | false |
| `--help` | Show help | |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | For DNS automation |
| `CLOUDFLARE_ZONE_NAME` | Cloudflare zone name (default: same as TNA_DOMAIN) | For DNS automation |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID (auto-detected if not set) | Optional |
| `PUBLIC_IP` | Server public IP (auto-detected if not set) | Optional |

## What It Installs

- System packages (curl, git, ufw, sqlite3, build-essential, etc.)
- Node.js 22.x
- Caddy web server (reverse proxy with auto HTTPS)
- UFW firewall (SSH + 80 + 443 only)
- TNA Provider app from GitHub
- SQLite database + migration
- systemd service (non-root user)
- Daily database backup timer (14-day retention)
- Cloudflare DNS A records for @, app, www

## Architecture

```
Internet ──> Cloudflare DNS ──> VPS IP ──> Caddy (HTTPS) ──> Node.js (port 3000)
                                              ├── tnaprovider.com.au
                                              └── app.tnaprovider.com.au
```

## File Locations

| Path | Purpose |
|------|---------|
| `/opt/tnaprovider` | Application code |
| `/var/lib/tnaprovider` | SQLite database |
| `/var/log/tnaprovider` | Application logs (journald) |
| `/var/backups/tnaprovider` | Database backups |
| `/etc/caddy/Caddyfile` | Caddy configuration |
| `/etc/systemd/system/tnaprovider.service` | systemd service |
| `/etc/systemd/system/tnaprovider-backup.timer` | Daily backup timer |

## Safety

- Never commits or prints secrets
- Detects existing production and warns before modifying
- Backs up Caddyfile and systemd service before changes
- Idempotent — safe to re-run
- App runs as non-root system user
- Port 3000 listens on 127.0.0.1 only
- UFW blocks everything except SSH, HTTP, HTTPS
- `.env` has `chmod 600`
