# Migration System

The database uses versioned, idempotent migrations. Each migration is a self-contained JavaScript module under `server/db/migrations/`.

## File Format

Each migration file exports three values:

```js
export const version = '008';
export const name = 'professional-quotes';
export function migrate(db) {
  // migration logic here
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
}
```

| Export | Description |
|---|---|
| `version` | String identifier, zero-padded to 3 digits (`001`–`008`) |
| `name` | Human-readable kebab-case name |
| `migrate(db)` | Function receiving a `better-sqlite3` Database instance |

## Current Migrations

| File | Version | Name |
|---|---|---|
| `001-initial-schema.js` | 001 | `initial-schema` |
| `002-auth-invites.js` | 002 | `auth-invites` |
| `003-client-portal.js` | 003 | `client-portal` |
| `004-realtime-timesheets.js` | 004 | `realtime-timesheets` |
| `005-pay-rules.js` | 005 | `pay-rules` |
| `006-platform-modules.js` | 006 | `platform-modules` |
| `007-contact-requests.js` | 007 | `contact-requests` |
| `008-professional-quotes.js` | 008 | `professional-quotes` |

## Idempotency

All migrations are safe to run multiple times. They achieve this by:

1. **Checking `schema_migrations` first** — each migration exits early if its version is already recorded:

```js
const existing = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
if (existing) return;
```

2. **Using `CREATE TABLE IF NOT EXISTS`** for all new tables.
3. **Using `CREATE INDEX IF NOT EXISTS`** for all new indexes.
4. **Using column-existence checks** via `PRAGMA table_info()` before `ALTER TABLE ADD COLUMN`:

```js
function addColumnIfMissing(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
```

### Dangerous Migrations (Table Rebuilds)

Some migrations alter `CHECK` constraints, which requires table recreation. These migrations temporarily disable foreign key enforcement and use a rename pattern:

```js
db.pragma("foreign_keys = OFF");
// ... create new table, copy data, drop old, rename ...
db.pragma("foreign_keys = ON");
const errors = db.prepare("PRAGMA foreign_key_check").all();
if (errors.length > 0) throw new Error("Foreign key violations");
```

This pattern is used in migrations `004` (shift_events source constraint), `006` (users status constraint), and `008` (quotes status constraint).

## Migration Runner

The runner is `server/db/versioned-migrate.js`:

```js
export async function runVersionedMigrations(db) {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    const { version, name, migrate } = await import(`file://${filePath}`);

    const alreadyApplied = db.prepare(
      "SELECT version FROM schema_migrations WHERE version = ?"
    ).get(version);

    if (alreadyApplied) continue;

    console.log(`Running migration ${version}: ${name}`);
    migrate(db);
  }
}
```

It reads all `.js` files from `server/db/migrations/`, sorts them alphabetically, dynamically imports each one, and skips already-applied versions by checking `schema_migrations`.

## `schema_migrations` Table

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
```

This table tracks which migrations have been applied. It is created by migration `001` and also bootstrapped by `server/db/migrate.js` if missing.

Example contents:

```
version | name                | applied_at
001     | initial-schema      | 2025-06-15 10:30:00
002     | auth-invites        | 2025-06-15 10:30:01
...
```

## Compatibility Wrapper

`server/db/migrate.js` exports a backward-compatible `migrate()` function:

```js
export async function migrate() {
  const db = getDb();

  // Bootstrap schema_migrations table
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (...)`);

  // Run versioned migrations
  await runVersionedMigrations(db);

  // Fall back to legacy monolithic migration if needed
  if (versionedTableCount > 0) {
    // Verify required tables exist
    // Run legacy migration for any missing tables
  } else {
    runLegacyMigration(db);
  }
}
```

This ensures:
- New installations get the full set of versioned migrations
- Old databases created by the monolithic migration are caught up
- The `migrate()` function can be called from `npm run db:migrate`, `startup.js`, and the `install.sh` script

## How to Run Migrations

```bash
npm run db:migrate
```

This executes:

```bash
node --input-type=module -e "import {migrate} from './server/db/migrate.js'; await migrate();"
```

Migrations also run automatically on server startup via `server/startup.js`:

```js
import { migrate } from './db/migrate.js';

// During startup:
await migrate();
```

## How to Add a New Migration

1. Create a new file in `server/db/migrations/` with the next version number (e.g., `009-my-feature.js`):

```js
export const version = '009';
export const name = 'my-feature';
export function migrate(db) {
  const existing = db.prepare(
    "SELECT version FROM schema_migrations WHERE version = ?"
  ).get(version);
  if (existing) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS my_new_table (
      id TEXT PRIMARY KEY,
      ...
    );
  `);

  db.prepare(
    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))"
  ).run(version, name);
}
```

2. Test idempotency by running `npm run db:migrate` multiple times.
3. Verify the migration is applied correctly by checking the `schema_migrations` table.
