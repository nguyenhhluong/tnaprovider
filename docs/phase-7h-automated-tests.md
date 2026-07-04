# Phase 7H — Automated Tests

## Overview

Phase 7H adds automated regression tests for TNA Provider's core APIs, role security, pay rules, and payroll logic.

Tests run against a **local test database only**. No production data is accessed.

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
- MAIL_PROVIDER must stay `mock` — tests fail if provider is real/smtp
