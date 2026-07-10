# Backup and Restore

## Database Location

By default, the SQLite database is stored at `data/tna.db` (relative to the project root). This is configurable via the `DATABASE_URL` environment variable:

```bash
# Default (development)
DATABASE_URL=data/tna.db

# Production (set by install.sh)
DATABASE_URL=/var/lib/tnaprovider/tna.db
```

## Backup Procedures

### Option 1: SQLite `.backup` Command (Recommended)

Use the SQLite shell to create a consistent snapshot:

```bash
sqlite3 data/tna.db ".backup backups/tna-db-backup-$(date +%Y%m%d-%H%M%S).db"
```

This creates a consistent copy without locking for extended periods.

### Option 2: File Copy with WAL Checkpoint

For a safe file-level copy, checkpoint the WAL first:

```bash
sqlite3 data/tna.db "PRAGMA wal_checkpoint(FULL);"
cp data/tna.db "backups/tna-db-backup-$(date +%Y%m%d-%H%M%S).db"
```

### Option 3: VACUUM INTO (Live, No Downtime)

The application exposes an API endpoint (`POST /api/admin-tools/backups`, owner-only) that uses SQLite's `VACUUM INTO` to create a backup while the server is running:

```bash
# Requires owner authentication
curl -X POST https://app.tnaprovider.com.au/api/admin-tools/backups \
  -H "Cookie: tna_session=..."
```

This creates a backup file in `data/backups/` with the format `tna-db-backup-YYYYMMDD-HHMMSS.sqlite`.

### Option 4: Automated Backups (via install.sh)

The `install.sh` script sets up a systemd daily backup timer:

- **Backup script**: `/usr/local/bin/tnaprovider-backup.sh`
- **Systemd timer**: `tnaprovider-backup.timer` (runs daily)
- **Systemd service**: `tnaprovider-backup.service`
- **Backup directory**: `/var/backups/tnaprovider/` (production) or `data/backups/` (development)

The backup script:
1. Copies the SQLite database file with a timestamp: `tna-db-YYYYMMDD-HHMMSS.db`
2. Retains the 14 most recent backups, removing older ones

```bash
# The backup script logic:
BACKUP_DIR=/var/backups/tnaprovider
DATA_DIR=/var/lib/tnaprovider
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp "${DATA_DIR}/tna.db" "${BACKUP_DIR}/tna-db-${TIMESTAMP}.db"
find "${BACKUP_DIR}" -name 'tna-db-*.db' -type f | sort | head -n -14 | xargs -r rm
```

### Contact Form Submissions Backup

Contact form submissions are also written to `data/contact-submissions.json` as a JSON array. This provides a human-readable backup independent of the SQLite database. Each submission is appended to the file using `appendToJsonBackup()` in `server/modules/contactRequests/contactRequests.service.js`.

## Restore / Rollback Procedure

1. Stop the application:

```bash
systemctl stop tnaprovider
```

2. (Optional) Back up the current database before restoring:

```bash
cp /var/lib/tnaprovider/tna.db /var/lib/tnaprovider/tna.db.pre-restore
```

3. Restore from a backup file:

```bash
# Using the automated backup
cp /var/backups/tnaprovider/tna-db-20250615-023000.db /var/lib/tnaprovider/tna.db

# Or from a manual backup
cp backups/tna-db-backup-20250615-023000.db data/tna.db
```

4. Restart the application:

```bash
systemctl start tnaprovider
```

5. Verify the restore:

```bash
curl -f http://127.0.0.1:3000/health/ready
npm run db:migrate  # Ensure schema is up to date
```

### Downgrade Note

Since migrations are additive (no destructive DDL), restoring an older backup will work correctly. If you restore a backup from before a migration was applied, running `npm run db:migrate` will re-apply the missing migrations. The `schema_migrations` table will reflect the state at backup time, and pending migrations will be detected and applied.
