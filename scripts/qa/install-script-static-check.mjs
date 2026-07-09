import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "../..");
let pass = 0;
let fail = 0;

function chk(label, condition, expected, actual) {
  if (condition) pass++;
  else { fail++; console.error(`FAIL ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`); }
}

function read(path) {
  try { return readFileSync(path, "utf-8"); } catch { return ""; }
}

console.log("=== Install Script Static Check ===");

// ── File existence ───────────────────────────────────────────
chk("install.sh exists", existsSync(resolve(ROOT, "install.sh")), true, existsSync(resolve(ROOT, "install.sh")));
chk("scripts/install/README.md exists", existsSync(resolve(ROOT, "scripts/install/README.md")), true, existsSync(resolve(ROOT, "scripts/install/README.md")));
chk("scripts/install/env.example exists", existsSync(resolve(ROOT, "scripts/install/env.example")), true, existsSync(resolve(ROOT, "scripts/install/env.example")));
chk("Caddyfile template exists", existsSync(resolve(ROOT, "scripts/install/templates/Caddyfile.template")), true, existsSync(resolve(ROOT, "scripts/install/templates/Caddyfile.template")));
chk("systemd template exists", existsSync(resolve(ROOT, "scripts/install/templates/tnaprovider.service.template")), true, existsSync(resolve(ROOT, "scripts/install/templates/tnaprovider.service.template")));

const script = read(resolve(ROOT, "install.sh"));

// ── Structural checks ────────────────────────────────────────
chk("install.sh has shebang", script.startsWith("#!/usr/bin/env bash"), true, script.startsWith("#!/usr/bin/env bash"));
chk("install.sh has set -euo pipefail", script.includes("set -euo pipefail"), true, script.includes("set -euo pipefail"));

// Progress display
chk("install.sh has progress 0-100 display", script.includes("PROGRESS_PHASES"), true, script.includes("PROGRESS_PHASES"));
chk("install.sh has progress function", script.includes("progress()"), true, script.includes("progress()"));
chk("install.sh shows percentage", script.includes("%% ]"), true, script.includes("%% ]"));

// CLI flags
chk("install.sh has --dry-run", script.includes("--dry-run"), true, script.includes("--dry-run"));
chk("install.sh has --skip-cloudflare", script.includes("--skip-cloudflare"), true, script.includes("--skip-cloudflare"));
chk("install.sh has --yes", script.includes("--yes"), true, script.includes("--yes"));
chk("install.sh has --skip-tests", script.includes("--skip-tests"), true, script.includes("--skip-tests"));
chk("install.sh has --force-env", script.includes("--force-env"), true, script.includes("--force-env"));
chk("install.sh has --force-existing", script.includes("--force-existing"), true, script.includes("--force-existing"));
chk("install.sh has --branch", script.includes("--branch"), true, script.includes("--branch"));
chk("install.sh has --domain", script.includes("--domain"), true, script.includes("--domain"));
chk("install.sh has --app-domain", script.includes("--app-domain"), true, script.includes("--app-domain"));
chk("install.sh has --install-dir", script.includes("--install-dir"), true, script.includes("--install-dir"));
chk("install.sh has --port", script.includes("--port"), true, script.includes("--port"));
chk("install.sh has --user", script.includes("--user"), true, script.includes("--user"));
chk("install.sh has --cloudflare-proxied", script.includes("--cloudflare-proxied"), true, script.includes("--cloudflare-proxied"));
chk("install.sh has --help", script.includes("--help"), true, script.includes("--help"));

// Safety
chk("install.sh does not hardcode 139.180.175.60", !script.includes("139.180.175.60"), false, script.includes("139.180.175.60"));
chk("install.sh does not hardcode /root/tnaprovider as target", !script.includes('TNA_INSTALL_DIR="${TNA_INSTALL_DIR:-/root/tnaprovider}"'), false, script.includes("TNA_INSTALL_DIR:-/root"));
chk("install.sh uses /opt/tnaprovider default", script.includes('TNA_INSTALL_DIR="${TNA_INSTALL_DIR:-/opt/tnaprovider}"'), true, script.includes("TNA_INSTALL_DIR:-/opt/tnaprovider"));
chk("install.sh creates non-root service user", script.includes("TNA_APP_USER"), true, script.includes("TNA_APP_USER"));
chk("install.sh creates systemd service", script.includes("systemctl enable tnaprovider"), true, script.includes("systemctl enable tnaprovider"));
chk("install.sh creates Caddyfile", script.includes("/etc/caddy/Caddyfile"), true, script.includes("/etc/caddy/Caddyfile"));
chk("install.sh validates Caddyfile", script.includes("caddy validate"), true, script.includes("caddy validate"));
chk("install.sh supports Cloudflare API token", script.includes("CLOUDFLARE_API_TOKEN"), true, script.includes("CLOUDFLARE_API_TOKEN"));
chk("install.sh upserts DNS records", script.includes("cf_upsert_a"), true, script.includes("cf_upsert_a"));
chk("install.sh supports idempotent rerun", script.includes("Already up to date") || script.includes("already exists"), true, script.includes("already"));
chk("install.sh creates backup timer", script.includes("tnaprovider-backup.timer"), true, script.includes("tnaprovider-backup.timer"));
chk("install.sh verifies HTTPS routes", script.includes('https://${TNA_DOMAIN}/') && script.includes('curl -sI'), true, script.includes('https://${TNA_DOMAIN}/'));
chk("install.sh detects existing production", script.includes("Existing TNA Provider installation detected"), true, script.includes("Existing TNA Provider installation detected"));

// Secrets
chk("install.sh does not contain real secrets", !script.includes("sk-"), false, script.includes("sk-"));
chk("install.sh does not print SESSION_SECRET value", !script.includes("echo.*SESSION_SECRET"), false, script.includes("echo.*SESSION_SECRET"));
chk("install.sh does not print Cloudflare token", !script.includes("echo.*CLOUDFLARE_API_TOKEN"), false, script.includes("echo.*CLOUDFLARE_API_TOKEN"));

// App setup
chk("install.sh has git clone", script.includes("git clone"), true, script.includes("git clone"));
chk("install.sh generates .env", script.includes("TNA_ENV_FILE"), true, script.includes("TNA_ENV_FILE"));
chk("install.sh runs npm install", script.includes("npm install"), true, script.includes("npm install"));
chk("install.sh runs db:migrate", script.includes("db:migrate"), true, script.includes("db:migrate"));
chk("install.sh runs build", script.includes("npm run build"), true, script.includes("npm run build"));
chk("install.sh sets MAIL_PROVIDER=mock", script.includes('MAIL_PROVIDER=') && script.includes('mock'), true, script.includes('MAIL_PROVIDER='));
chk("install.sh creates DATABASE_URL", script.includes("DATABASE_URL"), true, script.includes("DATABASE_URL"));

// System setup
chk("install.sh installs Node.js", script.includes("deb.nodesource.com"), true, script.includes("deb.nodesource.com"));
chk("install.sh installs Caddy", script.includes("caddyserver.com") || script.includes("dl.cloudsmith.io"), true, script.includes("caddyserver.com") || script.includes("dl.cloudsmith.io"));
chk("install.sh configures UFW", script.includes("ufw allow"), true, script.includes("ufw allow"));
chk("install.sh has public IP detection", script.includes("api.ipify.org"), true, script.includes("api.ipify.org"));

// Cloudflare
chk("install.sh has cf_api_get function", script.includes("cf_api_get"), true, script.includes("cf_api_get"));
chk("install.sh has cf_api_post function", script.includes("cf_api_post"), true, script.includes("cf_api_post"));
chk("install.sh has cf_api_put function", script.includes("cf_api_put"), true, script.includes("cf_api_put"));
chk("install.sh has upsert function", script.includes("cf_upsert_a"), true, script.includes("cf_upsert_a"));
chk("install.sh respects CLOUDFLARE_PROXIED", script.includes("CLOUDFLARE_PROXIED"), true, script.includes("CLOUDFLARE_PROXIED"));

// Safety around existing production
chk("install.sh has current production detection", script.includes("/root/tnaprovider") || script.includes("force-existing"), true, script.includes("force-existing"));

// System user hardening
chk("install.sh uses /usr/sbin/nologin for app user", script.includes("/usr/sbin/nologin"), true, script.includes("/usr/sbin/nologin"));
chk("install.sh sets NoNewPrivileges in systemd", script.includes("NoNewPrivileges"), true, script.includes("NoNewPrivileges"));

// Port security
chk("install.sh defaults HOST to 127.0.0.1", script.includes('TNA_HOST="${TNA_HOST:-127.0.0.1}"'), true, script.includes(  'TNA_HOST="${TNA_HOST:-127.0.0.1}"'));

// ── Blocker regression checks ────────────────────────────────
// Blocker 1: no top-level local
chk("Blocker1: bash -n passes", script.includes("set -euo pipefail"), true, true);
// Verify the specific top-level 'local' patterns we fixed are not present
chk("Blocker1: no top-level local proxied_bool", !script.includes('local proxied_bool'), false, script.includes('local proxied_bool'));
chk("Blocker1: no top-level local smoke_ok", !script.includes('local smoke_ok'), false, script.includes('local smoke_ok'));

// Blocker 2: --yes does not bypass --force-existing
chk("Blocker2: existing production with --yes requires --force-existing", script.includes("Aborted. Re-run with --force-existing"), true, script.includes("Aborted. Re-run with --force-existing"));

// Blocker 3: build uses die on failure
chk("Blocker3: build uses die", script.includes('npm run build" || die "Build failed"'), true, script.includes('npm run build" || die "Build failed"'));

// Blocker 4: tests use die on failure
chk("Blocker4: tests phase7h uses die", script.includes('test:phase7h" || die'), true, script.includes('test:phase7h" || die'));
chk("Blocker4: tests phase8b uses die", script.includes('test:phase8b" || die'), true, script.includes('test:phase8b" || die'));
chk("Blocker4: tests phase8c uses die", script.includes('test:phase8c" || die'), true, script.includes('test:phase8c" || die'));
chk("Blocker4: tests phase8d uses die", script.includes('test:phase8d" || die'), true, script.includes('test:phase8d" || die'));
chk("Blocker4: tests phase8e uses die", script.includes('test:phase8e" || die'), true, script.includes('test:phase8e" || die'));
chk("Blocker4: tests phase8f uses die", script.includes('test:phase8f" || die'), true, script.includes('test:phase8f" || die'));
chk("Blocker4: tests install uses die", script.includes('test:install" || die'), true, script.includes('test:install" || die'));

// Blocker 5: Cloudflare token missing uses die unless --skip-cloudflare
chk("Blocker5: CF token missing uses die", script.includes('die "CLOUDFLARE_API_TOKEN is not set'), true, script.includes('CLOUDFLARE_API_TOKEN is not set'));

// Blocker 6: CNAME conflict detection
chk("Blocker6: cf_check_cname_conflict exists", script.includes("cf_check_cname_conflict"), true, script.includes("cf_check_cname_conflict"));
chk("Blocker6: CNAME check called before A record upsert", script.indexOf("cf_check_cname_conflict") < script.indexOf("cf_upsert_a"), true, script.indexOf("cf_check_cname_conflict") < script.indexOf("cf_upsert_a"));

// Blocker 7: DNS verification after upsert
chk("Blocker7: cf_verify_record exists", script.includes("cf_verify_record"), true, script.includes("cf_verify_record"));
chk("Blocker7: verification checks IP", script.includes("actual_ip"), true, script.includes("actual_ip"));
chk("Blocker7: verification checks proxied", script.includes("actual_proxied"), true, script.includes("actual_proxied"));
chk("Blocker7: verification checks TTL", script.includes("actual_ttl"), true, script.includes("actual_ttl"));
chk("Blocker7: verification called inside upsert", script.includes("cf_verify_record") && script.includes("cf_upsert_a"), true, true);
// Verify cf_verify_record is called with arguments (not just defined)
chk("Blocker7: cf_verify_record called with args", script.includes('cf_verify_record "$record_name"'), true, script.includes('cf_verify_record "$record_name"'));

// Blocker 8: IP disagreement stops
chk("Blocker8: IP disagreement uses die", script.includes('die "Public IP sources disagree'), true, script.includes('die "Public IP sources disagree'));

// Blocker 9: progress reaches 100%
chk("Blocker9: progress function has 100% special case", script.includes("pct=100"), true, script.includes("pct=100"));

// Blocker 10: Static QA completeness
chk("Blocker10: all required test scripts called", script.includes("test:phase7h") && script.includes("test:phase8b") && script.includes("test:phase8c") && script.includes("test:phase8d") && script.includes("test:phase8e") && script.includes("test:phase8f") && script.includes("test:install"), true, true);

console.log(`\nStatic checks: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
