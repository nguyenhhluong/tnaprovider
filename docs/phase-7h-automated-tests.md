# Phase 7H — Automated Tests

## Overview

Phase 7H adds automated regression tests for TNA Provider's core APIs, role security, pay rules, and payroll logic.

Tests run against a **local test database only**. No production data is accessed. `MAIL_PROVIDER` is always `mock`.

## Test Scripts

| Script | Command | What it protects |
|--------|---------|------------------|
| `scripts/qa/routes-smoke.mjs` | `npm run test:routes` | Marketing + app routes return 200 |
| `scripts/qa/api-contracts.mjs` | `npm run test:api` | API endpoints return valid JSON with expected shapes |
| `scripts/qa/role-access.mjs` | `npm run test:roles` | Role-based access control matrix (owner/admin/manager/worker/client/unauth) |
| `scripts/qa/payroll-rules.mjs` | `npm run test:payroll` | Pay Rules Phase 7F: create, clear DT, active uniqueness, validation |

## Run All Tests

```bash
npm run test:phase7h
```

## Test Requirements

- Node.js >= 20
- Local filesystem access (test DBs are created in `data/`)
- No production database access needed
- No real email configuration needed

## Harness Design

### Problem: Shell Quoting With Inline ESM

The initial harness used `execSync` with `node --input-type=module -e '…'` to run database setup (migrate + seed) in a child process:

```js
execSync(`node --input-type=module -e '${setupCode}'`, { … });
```

The `setupCode` string contained single-quoted import paths like `from './server/db/migrate.js'`. When the outer shell parsed the `-e` argument, it **stripped the inner single quotes**, turning the code into:

```js
import {migrate} from ./server/db/migrate.js;
//                      ^^ SyntaxError: Unexpected token '.'
```

This is a fundamental shell quoting conflict: the outer single-quote shell string consumes inner single quotes intended for JavaScript string literals.

### Root Cause

The POSIX shell treats single-quote pairs as literal strings with no escape mechanism. Any single quote inside a single-quoted string terminates the string, so `'from './server/…''` is parsed as the string `from ` followed by the unquoted `./server/…` — hence the `unexpected token '.'` error.

### Final Fix: spawn With stdin

The fix replaces `execSync` with `spawn('node', ['--input-type=module'])` and writes the ESM code to the child's **stdin**:

```js
const proc = spawn("node", ["--input-type=module"], {
  cwd: ROOT,
  stdio: ["pipe", "pipe", "pipe"],
  env: childEnv,
});
proc.stdin.write(setupCode);
proc.stdin.end();
// await process completion…
```

Why this works:
- The `-e` flag is **not used**, so no shell quoting of the code string occurs.
- The code is piped directly into the Node.js process stdin, which `--input-type=module` reads as ESM.
- Single quotes inside the code are JavaScript string delimiters, not shell metacharacters.
- The argument array `['node', '--input-type=module']` bypasses the shell entirely (no `shell: true`).

### How `withServer` Works Now

```js
export async function withServer({ dbPath, setupEnv }, fn)
```

1. **Delete old DB** — removes the previous test DB file so each run starts fresh.
2. **Check port** — calls `ensurePortFree(3007)` to avoid conflicting with another server.
3. **Build env** — merges `DATABASE_URL`, `APP_ENV=test`, `SESSION_SECRET`, `MAIL_PROVIDER=mock`, `HOST`, `PORT` into the child environment.
4. **Setup** — spawns `node --input-type=module` with migrate (+ seed if `setupEnv` provided) piped to stdin. The child process creates the schema and optionally seeds an owner user.
5. **Start server** — spawns `node server.js` with the test env vars. Waits up to 30 s for the server to respond to `GET /`.
6. **Run tests** — invokes the user-supplied `fn` callback with the server ready.
7. **Stop server** — sends `SIGTERM` and polls for the port to be released (up to 5 s).
8. **Clean up** — deletes the test DB file.

### Test DB Lifecycle

```
Delete previous test-*.db
        ↓
Set DATABASE_URL, APP_ENV=test, MAIL_PROVIDER=mock
        ↓
Child process: migrate() [+ seed() if setupEnv]
        ↓
Start node server.js on 127.0.0.1:3007
        ↓
Poll GET / until 200 (30 s timeout)
        ↓
Run test assertions
        ↓
Kill server (SIGTERM)
        ↓
Wait for port release
        ↓
Delete test-*.db
```

## Self-Contained Test Flow

Each test script is completely self-contained:

- **routes-smoke.mjs** — migrate only, checks 36 routes (9 marketing + 27 app)
- **api-contracts.mjs** — migrate + seed, checks 9 API contract shapes
- **role-access.mjs** — migrate + seed, checks 6+ role assertions (owner + SKIP-capable secondary roles)
- **payroll-rules.mjs** — migrate + seed, checks 10 assertions (pay rules + payroll math via exported helper)

All four pass sequentially via:

```bash
npm run test:phase7h
```

## Security & Isolation

- `MAIL_PROVIDER` is always `mock` — `MAIL_PROVIDER=mock` is hard-coded in the harness env. The test fails if real email is detected.
- Production DB is never touched — each test creates a fresh DB at `data/test-*.db`, which is deleted on cleanup.
- No production server is used — the harness starts its own server on `127.0.0.1:3007`.
- No real customer data is accessed.
- Secrets (passwords, session keys) are ephemeral test values, never committed.

## Troubleshooting

### Port 3007 is in use

```bash
fuser -k 3007/tcp    # Linux — kills whatever is on the port
sleep 2
npm run test:phase7h
```

If a previous test run crashed without cleanup, the port may still be held. The harness polls for release after killing the server, but a rogue process must be killed manually.

### Login cookie missing / 401 on auth/me

Possible causes:
- The test DB was deleted or not seeded — check that `setupEnv` includes `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, and `SEED_OWNER_NAME`.
- The password in `mustGetCookie` does not match the seeded hash — regenerate the seed or update the test.
- The server started with a different `DATABASE_URL` than the setup — the harness uses `resolve(ROOT, dbPath)` to produce an absolute path, passed as `DATABASE_URL` for both setup and server processes.

### Migration / seed failure

The setup child process runs with `stdio: ["pipe", "pipe", "pipe"]`. If it exits non-zero, the harness throws with `Setup exited <code>: <stderr>`. Common causes:

- `better-sqlite3` module not found — ensure `node_modules` exists (`npm install`).
- Database path not writable — check that the `data/` directory exists.
- `SEED_OWNER_*` env vars missing — the seed function exits 1 if email, password, or name are not set.

### Shell quoting (if reverting to execSync)

If `execSync` with `-e` is ever needed again, the quoting pattern must avoid nested single quotes:

```js
// BROKEN — shell strips inner single quotes
execSync(`node --input-type=module -e '${code}'`);

// WORKAROUND — use double quotes for the shell and escape inner double quotes
execSync(`node --input-type=module -e "${code.replace(/"/g, '\\"')}"`);
```

But the preferred approach is always `spawn` with stdin as described above.

## Key Assertions

### Routes
- All marketing routes return 200
- All app routes return 200 or expected auth shell
- No 404/500 on any route

### API Contracts
- `/api/email/status` returns `provider: "mock"`
- JSON responses parse correctly (no HTML error pages)
- Expected data types (arrays are arrays, objects are objects)

### Role Access Matrix
- Owner/admin: full access
- Manager: reports + admin realtime allowed; users/pay-rules blocked
- Worker: own realtime allowed; admin realtime/reports/quotes/documents/pay-rules blocked
- Client: client portal allowed; all business APIs blocked
- Forced-password-change: auth/me allowed; business APIs return 403
- Unauthenticated: all protected APIs return 401

### Pay Rules
- Create rule with `double_time_after_hours`
- Clear `double_time_after_hours` to null
- Active rule uniqueness enforced
- Invalid DT ≤ OT returns 400
- Zero required values return 400
- Creating a second active rule deactivates the first
- Old rule becomes inactive

## Adding New Tests

1. Add a new script in `scripts/qa/`
2. Add a `test:*` script in `package.json`
3. Include it in the `test:phase7h` composite script if it should run by default

## Known Limits

- Tests are Node.js-based (API-level), not Playwright browser tests
- Tests require the server to bind to `127.0.0.1:3007`
- Test databases are ephemeral and prefixed with `test-` for gitignore safety
- `MAIL_PROVIDER` must stay `mock` — tests fail if provider is real/smtp
- Role-access secondary users (manager, worker, client) are not created by the seed and use a SKIP path instead of failing
