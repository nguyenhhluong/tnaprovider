#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# TNA Provider — One-Command VPS Installer with Cloudflare DNS
# ──────────────────────────────────────────────────────────────

SCRIPT_VERSION="1.0.0"
SCRIPT_URL="https://raw.githubusercontent.com/nguyenhhluong/tnaprovider/main/install.sh"

# ── Defaults ─────────────────────────────────────────────────
TNA_DOMAIN="${TNA_DOMAIN:-tnaprovider.com.au}"
TNA_APP_DOMAIN="${TNA_APP_DOMAIN:-app.tnaprovider.com.au}"
TNA_REPO="${TNA_REPO:-https://github.com/nguyenhhluong/tnaprovider.git}"
TNA_BRANCH="${TNA_BRANCH:-main}"
TNA_INSTALL_DIR="${TNA_INSTALL_DIR:-/opt/tnaprovider}"
TNA_APP_USER="${TNA_APP_USER:-tnaprovider}"
TNA_HOST="${TNA_HOST:-127.0.0.1}"
TNA_PORT="${TNA_PORT:-3000}"
TNA_DATA_DIR="/var/lib/tnaprovider"
TNA_LOG_DIR="/var/log/tnaprovider"
TNA_BACKUP_DIR="/var/backups/tnaprovider"
TNA_ENV_FILE="${TNA_INSTALL_DIR}/.env"
MAIL_PROVIDER="${MAIL_PROVIDER:-mock}"
APP_ENV="${APP_ENV:-production}"
NODE_VERSION="${NODE_VERSION:-22}"
CLOUDFLARE_PROXIED="${CLOUDFLARE_PROXIED:-false}"
PUBLIC_IP="${PUBLIC_IP:-}"

CLI_YES=false
CLI_DRY_RUN=false
CLI_SKIP_CLOUDFLARE=false
CLI_SKIP_TESTS=false
CLI_FORCE_ENV=false
CLI_FORCE_EXISTING=false
CLI_HELP=false

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Progress state ───────────────────────────────────────────
PROGRESS_PHASES=(
  "Starting TNA Provider installer"
  "Checking OS and root permissions"
  "Detecting public IP"
  "Installing system packages"
  "Installing Node.js"
  "Installing Caddy"
  "Configuring UFW firewall"
  "Creating service user"
  "Cloning repository"
  "Creating production .env"
  "Installing npm packages"
  "Running database migration"
  "Building frontend"
  "Running tests"
  "Configuring Caddy reverse proxy"
  "Configuring systemd service"
  "Configuring Cloudflare DNS"
  "Configuring backup timer"
  "Running smoke tests"
  "Installation complete"
)
TOTAL_PHASES=${#PROGRESS_PHASES[@]}
CURRENT_PHASE=0

progress() {
  local pct
  if [[ $CURRENT_PHASE -eq $(( TOTAL_PHASES - 1 )) ]]; then
    pct=100
  else
    pct=$(( CURRENT_PHASE * 100 / (TOTAL_PHASES - 1) ))
  fi
  printf "\n${CYAN}[ %3d%% ]${NC} ${BOLD}%s${NC}\n" "$pct" "${PROGRESS_PHASES[$CURRENT_PHASE]}"
  CURRENT_PHASE=$(( CURRENT_PHASE + 1 ))
  if $CLI_DRY_RUN; then echo "  (dry-run)"; fi
}

# ── Helpers ──────────────────────────────────────────────────
log()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }
die()  { err "$1"; echo -e "\n${RED}Install failed at step ${CURRENT_PHASE}/${TOTAL_PHASES}.${NC}"; echo -e "${YELLOW}Check logs above for details.${NC}"; exit 1; }
cmd()  { if $CLI_DRY_RUN; then echo "  > $*"; else "$@"; fi; }

# ── Parse CLI ────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: sudo ./install.sh [options]

Options:
  --yes                      Non-interactive mode (use defaults)
  --dry-run                  Show what would be done without making changes
  --skip-cloudflare          Skip Cloudflare DNS configuration
  --skip-tests               Skip running test suites after build
  --force-env                Overwrite existing .env file
  --force-existing           Allow running on existing production server
  --branch <branch>          Git branch to deploy (default: main)
  --domain <domain>          Primary domain (default: tnaprovider.com.au)
  --app-domain <domain>      App subdomain (default: app.tnaprovider.com.au)
  --install-dir <path>       Install directory (default: /opt/tnaprovider)
  --port <port>              App listen port (default: 3000)
  --user <linux-user>        System user for app (default: tnaprovider)
  --cloudflare-proxied <bool> Whether Cloudflare proxies traffic (default: false)
  --help                     Show this help message

Environment variables:
  CLOUDFLARE_API_TOKEN       Cloudflare API token (required for DNS automation)
  CLOUDFLARE_ZONE_NAME       Cloudflare zone name (default: same as TNA_DOMAIN)
  CLOUDFLARE_ZONE_ID         Cloudflare zone ID (optional, auto-detected)
  PUBLIC_IP                  Server public IP (optional, auto-detected)
  TNA_DOMAIN, TNA_APP_DOMAIN, TNA_REPO, TNA_BRANCH, TNA_INSTALL_DIR,
  TNA_APP_USER, TNA_PORT, MAIL_PROVIDER, APP_ENV

Examples:
  sudo ./install.sh
  sudo ./install.sh --yes --skip-cloudflare
  sudo CLOUDFLARE_API_TOKEN=xxxxx ./install.sh --yes
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) CLI_YES=true; shift ;;
    --dry-run) CLI_DRY_RUN=true; shift ;;
    --skip-cloudflare) CLI_SKIP_CLOUDFLARE=true; shift ;;
    --skip-tests) CLI_SKIP_TESTS=true; shift ;;
    --force-env) CLI_FORCE_ENV=true; shift ;;
    --force-existing) CLI_FORCE_EXISTING=true; shift ;;
    --help) CLI_HELP=true; shift ;;
    --branch) TNA_BRANCH="$2"; shift 2 ;;
    --domain) TNA_DOMAIN="$2"; shift 2 ;;
    --app-domain) TNA_APP_DOMAIN="$2"; shift 2 ;;
    --install-dir) TNA_INSTALL_DIR="$2"; TNA_ENV_FILE="${TNA_INSTALL_DIR}/.env"; shift 2 ;;
    --port) TNA_PORT="$2"; shift 2 ;;
    --user) TNA_APP_USER="$2"; shift 2 ;;
    --cloudflare-proxied) CLOUDFLARE_PROXIED="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

$CLI_HELP && usage

# ── Pre-flight checks ────────────────────────────────────────

progress

if [[ $EUID -ne 0 ]]; then
  die "This installer must be run as root (sudo)."
fi
log "Running as root"

# Detect existing production
if [[ -f /etc/systemd/system/tnaprovider.service || -d /root/tnaprovider ]]; then
  if ! $CLI_FORCE_EXISTING; then
    echo -e "\n${YELLOW}⚠ Existing TNA Provider installation detected.${NC}"
    echo "  This installer is designed for fresh VPS deployment."
    echo "  Use --force-existing only if you understand this will modify the current server."
    echo ""
    die "Aborted. Re-run with --force-existing to proceed."
  fi
  log "Existing installation acknowledged (--force-existing)"
fi

# OS detection
OS_ID=""
if [[ -f /etc/os-release ]]; then
  OS_ID=$(grep ^ID= /etc/os-release | cut -d= -f2 | tr -d '"')
fi
if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then
  die "Unsupported OS: $OS_ID. Only Ubuntu/Debian are supported."
fi
log "OS: $OS_ID"

progress

# ── Public IP detection ──────────────────────────────────────
detect_public_ip() {
  if [[ -n "$PUBLIC_IP" ]]; then
    echo "$PUBLIC_IP"
    return
  fi
  local ip1 ip2
  ip1=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "")
  ip2=$(curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null || echo "")
  if [[ -z "$ip1" && -z "$ip2" ]]; then
    die "Could not detect public IP. Set PUBLIC_IP=1.2.3.4 and re-run."
  fi
  if [[ -n "$ip1" && -n "$ip2" && "$ip1" != "$ip2" ]]; then
    echo ""
    warn "Public IP detection disagreement:"
    warn "  api.ipify.org: $ip1"
    warn "  ifconfig.me:   $ip2"
    die "Public IP sources disagree. Set PUBLIC_IP=<address> and re-run."
  fi
  echo "${ip1:-$ip2}"
}

progress

SERVER_IP=""
if $CLI_DRY_RUN; then
  SERVER_IP="203.0.113.1"
else
  SERVER_IP=$(detect_public_ip)
  if [[ -z "$SERVER_IP" ]]; then
    die "Could not determine public IP."
  fi
fi
log "Public IP: $SERVER_IP"

# ── Install system packages ──────────────────────────────────
progress

PKGS=(curl git ufw sqlite3 build-essential python3 python3-pip ca-certificates gnupg lsb-release jq unzip tar rsync)
if $CLI_DRY_RUN; then
  log "Packages to install: ${PKGS[*]}"
else
  apt-get update -qq || die "apt-get update failed"
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${PKGS[@]}" || die "Package installation failed"
  log "System packages installed"
fi

# ── Install Node.js ───────────────────────────────────────────
progress

if command -v node &>/dev/null && [[ "$(node -v)" == v${NODE_VERSION}* ]]; then
  log "Node.js already installed: $(node -v)"
else
  if $CLI_DRY_RUN; then
    log "Would install Node.js $NODE_VERSION"
  else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - || die "NodeSource setup failed"
    apt-get install -y -qq nodejs || die "Node.js installation failed"
    log "Node.js installed: $(node -v)"
  fi
fi
log "npm: $(npm -v)"

# ── Install Caddy ─────────────────────────────────────────────
progress

if command -v caddy &>/dev/null; then
  log "Caddy already installed: $(caddy version)"
else
  if $CLI_DRY_RUN; then
    log "Would install Caddy via official apt repo"
  else
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https 2>/dev/null || true
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg \
      || die "Caddy GPG key download failed"
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list \
      || die "Caddy apt source download failed"
    apt-get update -qq || die "apt-get update failed"
    apt-get install -y -qq caddy || die "Caddy installation failed"
    systemctl enable caddy 2>/dev/null || true
    systemctl start caddy 2>/dev/null || true
    log "Caddy installed: $(caddy version)"
  fi
fi

# ── Firewall ──────────────────────────────────────────────────
progress

if $CLI_DRY_RUN; then
  log "Would configure UFW: allow OpenSSH, 80/tcp, 443/tcp"
else
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  log "UFW configured: SSH + 80 + 443 allowed"
fi

# ── Create service user ──────────────────────────────────────
progress

if id "$TNA_APP_USER" &>/dev/null 2>&1; then
  log "User $TNA_APP_USER already exists"
else
  if $CLI_DRY_RUN; then
    log "Would create user: $TNA_APP_USER"
  else
    useradd --system --create-home --home-dir "$TNA_INSTALL_DIR" --shell /usr/sbin/nologin "$TNA_APP_USER" || die "Failed to create user $TNA_APP_USER"
    log "Created user: $TNA_APP_USER"
  fi
fi

# ── Create directories ───────────────────────────────────────
if ! $CLI_DRY_RUN; then
  mkdir -p "$TNA_INSTALL_DIR" "$TNA_DATA_DIR" "$TNA_LOG_DIR" "$TNA_BACKUP_DIR"
  chown -R "$TNA_APP_USER:$TNA_APP_USER" "$TNA_INSTALL_DIR" "$TNA_DATA_DIR" "$TNA_LOG_DIR" "$TNA_BACKUP_DIR"
  log "Directories created and ownership set"
fi

# ── Clone repository ─────────────────────────────────────────
progress

if ! $CLI_DRY_RUN; then
  if [[ -d "${TNA_INSTALL_DIR}/.git" ]]; then
    log "Repository already exists, updating..."
    cd "$TNA_INSTALL_DIR"
    git fetch --all || warn "git fetch failed"
    git checkout "$TNA_BRANCH" 2>/dev/null || git checkout -b "$TNA_BRANCH" origin/"$TNA_BRANCH" 2>/dev/null || true
    git reset --hard "origin/$TNA_BRANCH" || warn "git reset failed"
    log "Repository updated"
  else
    git clone --branch "$TNA_BRANCH" --depth 1 "$TNA_REPO" "${TNA_INSTALL_DIR}.tmp" || die "Git clone failed"
    shopt -s dotglob
    mv "${TNA_INSTALL_DIR}.tmp"/* "$TNA_INSTALL_DIR"/ 2>/dev/null || true
    mv "${TNA_INSTALL_DIR}.tmp"/.* "$TNA_INSTALL_DIR"/ 2>/dev/null || true
    rmdir "${TNA_INSTALL_DIR}.tmp" 2>/dev/null || true
    shopt -u dotglob
    log "Repository cloned to $TNA_INSTALL_DIR"
  fi
  chown -R "$TNA_APP_USER:$TNA_APP_USER" "$TNA_INSTALL_DIR"
  # Verify expected files
  for f in package.json server.js server/db/migrate.js src/App.tsx; do
    [[ -f "${TNA_INSTALL_DIR}/$f" ]] || die "Required file missing: $f"
  done
  log "Required project files verified"
fi

cd "$TNA_INSTALL_DIR"

# ── Create .env ──────────────────────────────────────────────
progress

SESSION_SECRET=$(tr -dc A-Za-z0-9\!\@\#\$\%\^\&\*\(\)\-_\=\+ < /dev/urandom 2>/dev/null | head -c 80 || openssl rand -base64 60)

if [[ -f "$TNA_ENV_FILE" && ! $CLI_FORCE_ENV ]]; then
  warn ".env already exists at $TNA_ENV_FILE (use --force-env to overwrite)"
else
  if $CLI_DRY_RUN; then
    log "Would create .env with secure SESSION_SECRET"
  else
    cat > "$TNA_ENV_FILE" <<EOF
# TNA Provider — Production Environment
# Generated by install.sh v${SCRIPT_VERSION}
APP_ENV=${APP_ENV}
NODE_ENV=${APP_ENV}
HOST=${TNA_HOST}
PORT=${TNA_PORT}
DATABASE_URL=${TNA_DATA_DIR}/tna.db
SESSION_SECRET=${SESSION_SECRET}
SESSION_COOKIE_NAME=tna_session
SESSION_TTL_HOURS=24
MAIL_PROVIDER=${MAIL_PROVIDER}
MAIL_DEFAULT_MAILBOX=info@${TNA_DOMAIN}
MAIL_ALLOWED_MAILBOXES=info@${TNA_DOMAIN}
APP_URL=https://${TNA_APP_DOMAIN}
APP_BASE_URL=https://${TNA_DOMAIN}
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
EOF
    chmod 600 "$TNA_ENV_FILE"
    chown "$TNA_APP_USER:$TNA_APP_USER" "$TNA_ENV_FILE"
    log ".env created at $TNA_ENV_FILE"
  fi
fi

# ── Install npm packages ─────────────────────────────────────
progress

if $CLI_DRY_RUN; then
  log "Would run: npm install"
else
  cd "$TNA_INSTALL_DIR"
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && npm install --no-audit --no-fund" || die "npm install failed"
  log "npm packages installed"
fi

# ── Database migration ───────────────────────────────────────
progress

if $CLI_DRY_RUN; then
  log "Would run: npm run db:migrate"
else
  sudo -u "$TNA_APP_USER" DATABASE_URL="${TNA_DATA_DIR}/tna.db" npm run db:migrate || die "Database migration failed"
  if [[ -f "${TNA_DATA_DIR}/tna.db" ]]; then
    log "Database created at ${TNA_DATA_DIR}/tna.db"
  else
    warn "Database file not found at expected path"
  fi
  chown -R "$TNA_APP_USER:$TNA_APP_USER" "$TNA_DATA_DIR"
fi

# ── Build frontend ────────────────────────────────────────────
progress

if $CLI_DRY_RUN; then
  log "Would run: npm run build"
else
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && npm run build" || die "Build failed"
fi

# ── Run tests ────────────────────────────────────────────────
progress

if $CLI_SKIP_TESTS; then
  warn "Tests skipped (--skip-tests)"
elif $CLI_DRY_RUN; then
  log "Would run: npm run test:phase7h, npm run test:phase8f, etc."
else
  log "Running tests..."
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && DATABASE_URL=${TNA_DATA_DIR}/tna.db npm run test:phase7h" || die "test:phase7h failed"
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && DATABASE_URL=${TNA_DATA_DIR}/tna.db npm run test:phase8b" || die "test:phase8b failed"
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && DATABASE_URL=${TNA_DATA_DIR}/tna.db npm run test:phase8c" || die "test:phase8c failed"
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && DATABASE_URL=${TNA_DATA_DIR}/tna.db npm run test:phase8d" || die "test:phase8d failed"
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && DATABASE_URL=${TNA_DATA_DIR}/tna.db npm run test:phase8e" || die "test:phase8e failed"
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && DATABASE_URL=${TNA_DATA_DIR}/tna.db npm run test:phase8f" || die "test:phase8f failed"
  sudo -u "$TNA_APP_USER" bash -c "cd '$TNA_INSTALL_DIR' && DATABASE_URL=${TNA_DATA_DIR}/tna.db npm run test:install" || die "test:install failed"
  log "All tests passed"
fi

# ── Caddy configuration ──────────────────────────────────────
progress

CADDYFILE="/etc/caddy/Caddyfile"
if $CLI_DRY_RUN; then
  log "Would configure Caddy for $TNA_DOMAIN and $TNA_APP_DOMAIN"
else
  if [[ -f "$CADDYFILE" ]]; then
    cp "$CADDYFILE" "${CADDYFILE}.bak.$(date +%Y%m%d-%H%M%S)"
    log "Existing Caddyfile backed up"
  fi
  cat > "$CADDYFILE" <<CADDYEOF
{
    email admin@${TNA_DOMAIN}
}

${TNA_DOMAIN}, www.${TNA_DOMAIN} {
    encode zstd gzip
    reverse_proxy ${TNA_HOST}:${TNA_PORT}
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

${TNA_APP_DOMAIN} {
    encode zstd gzip
    reverse_proxy ${TNA_HOST}:${TNA_PORT}
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
CADDYEOF
  log "Caddyfile written"
  caddy validate --config "$CADDYFILE" || die "Caddyfile validation failed"
  log "Caddyfile validated"
  systemctl reload caddy 2>/dev/null || systemctl restart caddy || die "Caddy reload/restart failed"
  systemctl is-active --quiet caddy || die "Caddy is not active"
  log "Caddy reloaded"
fi

# ── systemd service ──────────────────────────────────────────
progress

SERVICE_FILE="/etc/systemd/system/tnaprovider.service"
if $CLI_DRY_RUN; then
  log "Would create systemd service: tnaprovider"
else
  if [[ -f "$SERVICE_FILE" ]]; then
    cp "$SERVICE_FILE" "${SERVICE_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
    log "Existing service file backed up"
  fi
  cat > "$SERVICE_FILE" <<SERVICEEOF
[Unit]
Description=TNA Provider
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${TNA_APP_USER}
Group=${TNA_APP_USER}
WorkingDirectory=${TNA_INSTALL_DIR}
EnvironmentFile=${TNA_ENV_FILE}
ExecStart=/usr/bin/node ${TNA_INSTALL_DIR}/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=${TNA_INSTALL_DIR} ${TNA_DATA_DIR} ${TNA_LOG_DIR} ${TNA_BACKUP_DIR}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF
  log "systemd service file written"
  systemctl daemon-reload
  systemctl enable tnaprovider || die "Failed to enable tnaprovider service"
  systemctl restart tnaprovider || die "Failed to start tnaprovider service"
  sleep 2
  if systemctl is-active --quiet tnaprovider; then
    log "tnaprovider service is active"
  else
    die "tnaprovider service is not active. Check: journalctl -u tnaprovider --no-pager"
  fi
fi

# ── Cloudflare DNS ────────────────────────────────────────────
progress

CF_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
CF_API_BASE="https://api.cloudflare.com/client/v4"

cf_api_get() {
  local path="$1"
  curl -fsS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" "${CF_API_BASE}${path}"
}

cf_api_post() {
  local path="$1"; shift
  curl -fsS -X POST -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" -d "$@" "${CF_API_BASE}${path}"
}

cf_api_put() {
  local path="$1"; shift
  curl -fsS -X PUT -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" -d "$@" "${CF_API_BASE}${path}"
}

cf_check_cname_conflict() {
  local name="$1" zone_id="$2"
  local conflict
  conflict=$(cf_api_get "/zones/${zone_id}/dns_records?type=CNAME&name=${name}" 2>/dev/null | jq -r '.result_info.total_count // 0')
  if [[ "$conflict" -gt 0 ]]; then
    die "CNAME record already exists for ${name}. Remove it manually before creating A record."
  fi
}

cf_verify_record() {
  local name="$1" expected_ip="$2" expected_proxied="$3" zone_id="$4"
  sleep 2
  local record
  record=$(cf_api_get "/zones/${zone_id}/dns_records?type=A&name=${name}" 2>/dev/null)
  local actual_ip actual_proxied actual_ttl
  actual_ip=$(echo "$record" | jq -r '.result[0].content // ""')
  actual_proxied=$(echo "$record" | jq -r '.result[0].proxied // false')
  actual_ttl=$(echo "$record" | jq -r '.result[0].ttl // 0')
  if [[ "$actual_ip" != "$expected_ip" ]]; then
    die "DNS verification failed for ${name}: expected IP ${expected_ip}, got ${actual_ip}"
  fi
  if [[ "$actual_proxied" != "$expected_proxied" ]]; then
    die "DNS verification failed for ${name}: expected proxied=${expected_proxied}, got ${actual_proxied}"
  fi
  if [[ "$actual_ttl" -ne 1 ]]; then
    die "DNS verification failed for ${name}: expected TTL=1, got ${actual_ttl}"
  fi
  log "DNS A record ${name} verified: ${actual_ip} (proxied=${actual_proxied}, TTL=${actual_ttl})"
}

cf_upsert_a() {
  local name="$1" ip="$2" proxied="$3"
  local zone_id="$4"
  local record_name="${name}.${TNA_DOMAIN}"
  [[ "$name" == "@" ]] && record_name="$TNA_DOMAIN"

  # Check for CNAME conflict first
  cf_check_cname_conflict "$record_name" "$zone_id"

  local existing
  existing=$(cf_api_get "/zones/${zone_id}/dns_records?type=A&name=${record_name}" 2>/dev/null)
  local count
  count=$(echo "$existing" | jq -r '.result_info.total_count // 0' 2>/dev/null || echo 0)

  if [[ "$count" -gt 0 ]]; then
    local record_id old_ip
    record_id=$(echo "$existing" | jq -r '.result[0].id // ""')
    old_ip=$(echo "$existing" | jq -r '.result[0].content // ""')
    if [[ "$old_ip" == "$ip" ]]; then
      log "DNS A record ${record_name} already points to ${ip}"
    else
      cf_api_put "/zones/${zone_id}/dns_records/${record_id}" "{\"type\":\"A\",\"name\":\"${name}\",\"content\":\"${ip}\",\"ttl\":1,\"proxied\":${proxied}}" >/dev/null
      log "DNS A record ${record_name} updated: ${old_ip} → ${ip}"
    fi
  else
    cf_api_post "/zones/${zone_id}/dns_records" "{\"type\":\"A\",\"name\":\"${name}\",\"content\":\"${ip}\",\"ttl\":1,\"proxied\":${proxied}}" >/dev/null
    log "DNS A record ${record_name} created → ${ip}"
  fi

  # Verify after upsert
  cf_verify_record "$record_name" "$ip" "$proxied" "$zone_id"
}

if $CLI_SKIP_CLOUDFLARE; then
  warn "Cloudflare DNS skipped (--skip-cloudflare)"
elif [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  die "CLOUDFLARE_API_TOKEN is not set. Use --skip-cloudflare to skip DNS, or set CLOUDFLARE_API_TOKEN."
else
  if $CLI_DRY_RUN; then
    log "Would configure Cloudflare DNS for $TNA_DOMAIN"
  else
    # Get zone ID
    CF_ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-$TNA_DOMAIN}"
    if [[ -z "$CF_ZONE_ID" ]]; then
      CF_ZONE_ID=$(cf_api_get "/zones?name=${CF_ZONE_NAME}" | jq -r '.result[0].id // ""')
      if [[ -z "$CF_ZONE_ID" ]]; then
        die "Could not find Cloudflare zone for ${CF_ZONE_NAME}. Check CLOUDFLARE_ZONE_NAME."
      fi
      log "Cloudflare zone ID found"
    fi

    proxied_bool="false"
    if [[ "$CLOUDFLARE_PROXIED" == "true" ]]; then proxied_bool="true"; fi

    cf_upsert_a "@" "$SERVER_IP" "$proxied_bool" "$CF_ZONE_ID"
    cf_upsert_a "app" "$SERVER_IP" "$proxied_bool" "$CF_ZONE_ID"
    cf_upsert_a "www" "$SERVER_IP" "$proxied_bool" "$CF_ZONE_ID"

    log "Cloudflare DNS records configured"
  fi
fi

# ── Backup timer ──────────────────────────────────────────────
progress

BACKUP_SCRIPT="/usr/local/bin/tnaprovider-backup.sh"
BACKUP_TIMER="/etc/systemd/system/tnaprovider-backup.timer"
BACKUP_SERVICE="/etc/systemd/system/tnaprovider-backup.service"

if $CLI_DRY_RUN; then
  log "Would create daily backup timer"
else
  cat > "$BACKUP_SCRIPT" <<'BACKUPEOF'
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="{{BACKUP_DIR}}"
DATA_DIR="{{DATA_DIR}}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_FILE="${DATA_DIR}/tna.db"
[[ -f "$DB_FILE" ]] || exit 0
cp "$DB_FILE" "${BACKUP_DIR}/tna-db-${TIMESTAMP}.db"
find "${BACKUP_DIR}" -maxdepth 1 -name 'tna-db-*.db' -type f | sort | head -n -14 | xargs -r rm
BACKUPEOF
  sed -i "s|{{BACKUP_DIR}}|$TNA_BACKUP_DIR|g; s|{{DATA_DIR}}|$TNA_DATA_DIR|g" "$BACKUP_SCRIPT"
  chmod +x "$BACKUP_SCRIPT"

  cat > "$BACKUP_SERVICE" <<SERVICEEOF
[Unit]
Description=TNA Provider daily database backup

[Service]
Type=oneshot
ExecStart=${BACKUP_SCRIPT}
User=root
SERVICEEOF

  cat > "$BACKUP_TIMER" <<TIMEREOF
[Unit]
Description=Daily TNA Provider database backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
TIMEREOF

  systemctl daemon-reload
  systemctl enable tnaprovider-backup.timer || true
  systemctl start tnaprovider-backup.timer || true
  log "Daily backup timer created (14-day retention)"
fi

# ── Smoke tests ──────────────────────────────────────────────
progress

if $CLI_DRY_RUN; then
  log "Would run smoke tests"
else
  # Fatal core checks
  systemctl is-active --quiet tnaprovider || die "tnaprovider service not active"
  log "tnaprovider service active"
  systemctl is-active --quiet caddy || die "caddy service not active"
  log "caddy service active"

  curl -fsS "http://127.0.0.1:${TNA_PORT}/" >/dev/null || die "Local app not responding on port ${TNA_PORT}"
  log "Local app responding on port ${TNA_PORT}"

  # HTTPS checks with retry (5 attempts, 5s apart)
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && $CLI_SKIP_CLOUDFLARE == false ]]; then
    log "Skipping HTTPS checks (no Cloudflare DNS configured)"
  else
    https_ok=true
    for domain in "${TNA_DOMAIN}" "${TNA_APP_DOMAIN}"; do
      for attempt in 1 2 3 4 5; do
        if curl -sI "https://${domain}/" --max-time 10 >/dev/null 2>&1; then
          log "HTTPS working for ${domain} (attempt ${attempt})"
          break
        fi
        if [[ $attempt -eq 5 ]]; then
          if $CLI_SKIP_CLOUDFLARE; then
            warn "HTTPS check for ${domain} failed (DNS may not be configured)"
          else
            die "HTTPS check for ${domain} failed after 5 attempts"
          fi
          https_ok=false
        else
          sleep 5
        fi
      done
    done

    # PWA asset checks with retry
    for asset in manifest.webmanifest sw.js offline.html; do
      for attempt in 1 2 3 4 5; do
        if curl -sI "https://${TNA_APP_DOMAIN}/${asset}" --max-time 10 >/dev/null 2>&1; then
          log "PWA asset available: ${asset} (attempt ${attempt})"
          break
        fi
        if [[ $attempt -eq 5 ]]; then
          if $CLI_SKIP_CLOUDFLARE; then
            warn "PWA asset ${asset} not reachable (DNS may not be configured)"
          else
            die "PWA asset ${asset} not reachable after 5 attempts"
          fi
        else
          sleep 5
        fi
      done
    done
  fi

  log "Smoke tests passed"
fi

# ── Final summary ────────────────────────────────────────────
progress

cat <<SUMMARY

${GREEN}══════════════════════════════════════════════════════${NC}
${GREEN}  TNA Provider install complete.${NC}
${GREEN}══════════════════════════════════════════════════════${NC}

  ${BOLD}Domain:${NC}      https://${TNA_DOMAIN}
  ${BOLD}App domain:${NC}  https://${TNA_APP_DOMAIN}
  ${BOLD}Public IP:${NC}   ${SERVER_IP}
  ${BOLD}Install dir:${NC} ${TNA_INSTALL_DIR}
  ${BOLD}App user:${NC}    ${TNA_APP_USER}
  ${BOLD}Node version:${NC} $(node -v 2>/dev/null || echo "N/A")
  ${BOLD}npm version:${NC}  $(npm -v 2>/dev/null || echo "N/A")
  ${BOLD}Caddy version:${NC} $(caddy version 2>/dev/null || echo "N/A")
  ${BOLD}Service:${NC}     tnaprovider ($(systemctl is-active tnaprovider 2>/dev/null || echo "unknown"))
  ${BOLD}Database:${NC}    ${TNA_DATA_DIR}/tna.db
  ${BOLD}Backup path:${NC} ${TNA_BACKUP_DIR}
  ${BOLD}Backup timer:${NC} tnaprovider-backup.timer ($(systemctl is-active tnaprovider-backup.timer 2>/dev/null || echo "unknown"))

SUMMARY

if $CLI_DRY_RUN; then
  warn "Dry-run complete — no changes were made."
else
  log "For next login, use: ssh root@${SERVER_IP}"
  echo ""
  echo "  systemctl status tnaprovider"
  echo "  journalctl -u tnaprovider --since '5 minutes ago' --no-pager"
  echo ""
  echo "To re-run with different settings:"
  echo "  sudo ./install.sh --yes --force-env"
  echo ""
fi
