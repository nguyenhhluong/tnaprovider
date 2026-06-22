#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────
DOMAIN="tnaprovider.com.au"
WWW_DOMAIN="www.tnaprovider.com.au"
APP_DIR="/root/tnaprovider"
SERVICES=("caddy" "tnaprovider")
REQUIRED_BINS=("node" "npm" "caddy" "git" "ufw")
REQUIRED_PORTS=(22 80 443 3000)
REQUIRED_FILES=(
  "$APP_DIR/package.json"
  "$APP_DIR/server.js"
  "$APP_DIR/dist/index.html"
  "$APP_DIR/dist/assets"
  "/etc/caddy/Caddyfile"
  "/etc/systemd/system/tnaprovider.service"
)

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'
PASS=0; FAIL=0

pass() { PASS=$((PASS+1)); echo -e "  ${GREEN}✓ PASS${NC}  $*"; }
fail() { FAIL=$((FAIL+1)); echo -e "  ${RED}✗ FAIL${NC}  $*"; }

# ─── Header ──────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  TNA Provider — Smoke Test${NC}"
echo -e "${CYAN}  $(date)${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo ""

# ─── 1. Required binaries ────────────────────────────────────────
echo -e "${YELLOW}[1/5] Required binaries${NC}"
for bin in "${REQUIRED_BINS[@]}"; do
  if command -v "$bin" &>/dev/null; then
    pass "$bin found: $($bin --version 2>&1 | head -1)"
  else
    fail "$bin not found"
  fi
done
echo ""

# ─── 2. Required files ────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Required files${NC}"
for file in "${REQUIRED_FILES[@]}"; do
  if [[ -e "$file" ]]; then
    pass "$file exists"
  else
    fail "$file missing"
  fi
done
echo ""

# ─── 3. Systemd services ─────────────────────────────────────────
echo -e "${YELLOW}[3/5] Systemd services${NC}"
for svc in "${SERVICES[@]}"; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    pass "$svc service is active"
  else
    fail "$svc service is NOT active"
  fi
  if systemctl is-enabled --quiet "$svc" 2>/dev/null; then
    pass "$svc service is enabled (starts on boot)"
  else
    fail "$svc service is NOT enabled"
  fi
done
echo ""

# ─── 4. Listening ports ──────────────────────────────────────────
echo -e "${YELLOW}[4/5] Listening ports${NC}"
for port in "${REQUIRED_PORTS[@]}"; do
  if ss -tlnp sport = ":$port" 2>/dev/null | grep -q ":$port"; then
    pass "Port $port is listening"
  else
    fail "Port $port is NOT listening"
  fi
done
echo ""

# ─── 5. HTTP responses ───────────────────────────────────────────
echo -e "${YELLOW}[5/5] HTTP responses${NC}"

# Local Node server (port 3000)
if curl -sf -o /dev/null "http://127.0.0.1:3000/"; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/")
  pass "Local Node (port 3000) — HTTP $HTTP_CODE"
else
  fail "Local Node (port 3000) — unreachable"
fi

# Caddy reverse proxy (port 80)
if curl -sf -o /dev/null "http://127.0.0.1/"; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/")
  pass "Caddy HTTP (port 80) — HTTP $HTTP_CODE"
else
  fail "Caddy HTTP (port 80) — unreachable"
fi

# Check that the response contains expected content
if curl -s "http://127.0.0.1:3000/" | grep -qi "TNA Provider\|tnaprovider\|joinery\|construction\|fitout"; then
  pass "Response body contains expected content"
else
  fail "Response body missing expected content"
fi

# Check dist build output
if [[ -f "$APP_DIR/dist/index.html" ]] && grep -qi "TNA Provider" "$APP_DIR/dist/index.html"; then
  pass "dist/index.html contains TNA Provider"
else
  fail "dist/index.html missing or incomplete"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────────────
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}PASSED:${NC} $PASS   ${RED}FAILED:${NC} $FAIL"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}✗ Smoke test FAILED.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ All checks passed.${NC}"
  exit 0
fi
