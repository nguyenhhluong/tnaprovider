# Health Check Endpoints

Health endpoints are mounted at `/health` in `server/routes/health.js`. They are unauthenticated by design, as they are consumed by systemd, monitoring tools, and reverse proxies.

## GET /health/live

Simple alive check that proves the server process is running and Express is responding. Does not touch the database.

**Response** (HTTP 200):
```json
{
  "status": "alive"
}
```

**Status codes**:
- `200` — server is running

**Usage**: This endpoint is suitable for load balancer health checks and basic process monitoring.

## GET /health/ready

Full readiness check that validates the server can serve traffic. Checks:

| Check | What it tests |
|---|---|
| `database` | Can connect to SQLite and execute `SELECT 1` |
| `migrations` | At least one row exists in `schema_migrations` |
| `tables` | Required tables (`users`, `sessions`, `leads`, `projects`, `quotes`, `shift_sessions`) exist |
| `config` | Always `true` (reserved for future config validation) |

**Response** (HTTP 200 when all checks pass):
```json
{
  "status": "ready",
  "migrations": true,
  "database": true,
  "tables": true,
  "config": true
}
```

**Response** (HTTP 503 when any check fails):
```json
{
  "status": "not ready",
  "migrations": false,
  "database": true,
  "tables": false,
  "config": true
}
```

**Status codes**:
- `200` — all checks pass, server is ready
- `503` — one or more checks failed, server is not ready

## Deployment Usage

The systemd service and installer use these endpoints for deployment validation:

### Health Check After Service Start

```bash
# Check server is alive
curl -f http://127.0.0.1:3000/health/live

# Check server is ready (includes DB + migrations + tables)
curl -f http://127.0.0.1:3000/health/ready
```

### Smoke Test (from install.sh)

The `install.sh` script verifies the app is responding before marking deployment as complete:

```bash
curl -fsS "http://127.0.0.1:${TNA_PORT}/" >/dev/null || die "Local app not responding"
```

### systemd Service Dependencies

The systemd service uses `Type=simple` with `Restart=always`. The health endpoint can be used by external monitoring or custom health check scripts.

### Implementation Notes

- The `/health/ready` endpoint verifies database state every call — it does not cache results.
- Migrations check uses `COUNT(*) FROM schema_migrations` and requires at least 1 migration to be applied.
- Table check requires all 6 core tables to exist. Missing tables indicate incomplete migration.
- Database errors are caught silently — if `getDb()` throws or any query fails, all checks return `false` and the response is `503`.
