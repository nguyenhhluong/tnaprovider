#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────
DOMAIN="tnaprovider.com.au"
WWW_DOMAIN="www.tnaprovider.com.au"
REPO_URL="https://github.com/nguyenhhluong/tnaprovider"
APP_DIR="/root/tnaprovider"
NODE_USER="root"
NODE_VERSION="22"

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ─── Root check ──────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "This script must be run as root."
  exit 1
fi

# ─── Detect package manager ──────────────────────────────────────
if command -v apt-get &>/dev/null; then
  PKG_MANAGER="apt"
elif command -v yum &>/dev/null; then
  PKG_MANAGER="yum"
elif command -v dnf &>/dev/null; then
  PKG_MANAGER="dnf"
else
  err "Unsupported package manager. Only apt, yum, and dnf are supported."
  exit 1
fi

# ─── Install base dependencies ───────────────────────────────────
info "Updating package lists..."
$PKG_MANAGER update -qq

info "Installing base dependencies (curl, git, ufw)..."
if [[ "$PKG_MANAGER" == "apt" ]]; then
  $PKG_MANAGER install -y -qq curl git ufw
else
  $PKG_MANAGER install -y curl git ufw
fi
ok "Base dependencies installed."

# ─── Install Node.js ─────────────────────────────────────────────
if command -v node &>/dev/null; then
  INSTALLED_NODE=$(node --version | sed 's/v//' | cut -d. -f1)
  if [[ "$INSTALLED_NODE" -ge "$NODE_VERSION" ]]; then
    ok "Node.js v$(node --version) already installed."
  else
    warn "Node.js v$(node --version) is too old, upgrading..."
  fi
else
  info "Installing Node.js v$NODE_VERSION..."
fi

if ! command -v node &>/dev/null || [[ "$(node --version | sed 's/v//' | cut -d. -f1)" -lt "$NODE_VERSION" ]]; then
  if [[ "$PKG_MANAGER" == "apt" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y -qq nodejs
  else
    # Fallback: use nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install "$NODE_VERSION"
    nvm alias default "$NODE_VERSION"
  fi
  ok "Node.js v$(node --version) installed."
fi

# ─── Install Caddy ───────────────────────────────────────────────
if command -v caddy &>/dev/null; then
  ok "Caddy v$(caddy version | cut -d' ' -f1) already installed."
else
  info "Installing Caddy..."
  if [[ "$PKG_MANAGER" == "apt" ]]; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq
    apt-get install -y -qq caddy
  else
    # Fedora / RHEL fallback – direct binary download
    curl -fsSL https://github.com/caddyserver/caddy/releases/latest/download/caddy_linux_amd64.tar.gz | tar -xz -C /usr/local/bin/ caddy
    groupadd --system caddy 2>/dev/null || true
    useradd --system --gid caddy --create-home --home-dir /var/lib/caddy --shell /usr/sbin/nologin caddy 2>/dev/null || true
    mkdir -p /etc/caddy
    cat > /etc/systemd/system/caddy.service <<'CADDY_SVC'
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
CADDY_SVC
    systemctl daemon-reload
  fi
  ok "Caddy installed."
fi

# ─── Configure UFW (firewall) ────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 3000/tcp comment 'Node.js app (direct)'
ufw --force enable
ok "UFW configured. Ports 22, 80, 443, 3000 open."

# ─── Clone / pull repository ─────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repository exists at $APP_DIR. Pulling latest..."
  cd "$APP_DIR"
  git pull
else
  info "Cloning repository from $REPO_URL..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
ok "Repository up to date."

# ─── Create .env if missing ──────────────────────────────────────
if [[ -f "$APP_DIR/.env.example" ]] && [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  warn ".env created from .env.example — edit $APP_DIR/.env to add your GEMINI_API_KEY and APP_URL."
fi

# ─── Install npm dependencies ────────────────────────────────────
info "Installing npm dependencies..."
cd "$APP_DIR"
npm install
ok "npm dependencies installed."

# ─── Configure Caddy (auto HTTPS) ────────────────────────────────
info "Writing Caddyfile..."
mkdir -p /etc/caddy
cat > /etc/caddy/Caddyfile <<CADDYFILE
$DOMAIN, $WWW_DOMAIN {
    reverse_proxy 127.0.0.1:3000
}
CADDYFILE
ok "Caddyfile written for $DOMAIN and $WWW_DOMAIN (auto HTTPS via Let's Encrypt)."

info "Enabling and restarting Caddy..."
systemctl enable caddy 2>/dev/null || true
systemctl restart caddy
ok "Caddy running."

# ─── Build the project ───────────────────────────────────────────
info "Building the project..."
cd "$APP_DIR"
npm run build
ok "Build complete."

# ─── Create systemd service for the Node app ─────────────────────
info "Creating tnaprovider systemd service..."
cat > /etc/systemd/system/tnaprovider.service <<UNIT
[Unit]
Description=Tnaprovider Node.js App
After=network.target
Wants=caddy.service

[Service]
Type=simple
User=$NODE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable tnaprovider
systemctl restart tnaprovider
ok "tnaprovider service started."

# ─── Final check ─────────────────────────────────────────────────
sleep 2
echo ""
info "─── Verification ───"
if systemctl is-active --quiet caddy; then
  ok "Caddy ............ active"
else
  err "Caddy ........... NOT running"
fi
if systemctl is-active --quiet tnaprovider; then
  ok "tnaprovider ...... active"
else
  err "tnaprovider ..... NOT running"
fi

SERVER_IP=$(curl -4 -s ifconfig.me 2>/dev/null || curl -4 -s icanhazip.com 2>/dev/null || echo "unknown")
echo ""
info "Site should be live at:"
echo -e "  ${CYAN}https://$DOMAIN${NC}"
echo -e "  ${CYAN}https://$WWW_DOMAIN${NC}"
echo -e "  Direct: http://$SERVER_IP:3000"
echo ""
info "Deployment complete."
