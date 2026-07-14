# Database Schema

The application uses SQLite via `better-sqlite3`. The database file is located at `data/tna.db` (configurable via the `DATABASE_URL` environment variable).

## Tables and Purposes

### Core Tables

| Table | Purpose |
|---|---|
| `users` | User accounts with role-based access (`owner`, `admin`, `manager`, `worker`, `client`) |
| `sessions` | Active user sessions, linked to `users` with cascade delete |
| `audit_logs` | Immutable audit trail for all entity actions |

### CRM / Sales

| Table | Purpose |
|---|---|
| `leads` | Sales leads with scoring, temperature, and assignment |
| `lead_activities` | Activity log entries per lead (notes, calls, emails, meetings, site visits) |
| `lead_followups` | Scheduled follow-up tasks for leads |
| `contact_requests` | Website contact form submissions (also backed up to `data/contact-submissions.json`) |

### Projects

| Table | Purpose |
|---|---|
| `projects` | Construction projects with client, sector, budget, and timeline |
| `project_updates` | Progress updates posted to client portal per project |
| `project_update_comments` | Comments on project updates |
| `project_variations` | Scope variation requests with approval workflow |
| `project_tasks` | Task management with status, priority, and assignments |
| `project_task_templates` | Reusable task template definitions |
| `project_template_tasks` | Individual tasks within a task template |
| `project_task_comments` | Comments on project tasks |
| `client_portal_messages` | Messaging between client and admin per project |
| `client_project_access` | Junction table granting clients access to projects |

### Timesheets & Shifts

| Table | Purpose |
|---|---|
| `timesheets` | Legacy timesheet entries (pre-realtime) |
| `work_sites` | Physical work site locations with geocoordinates and QR codes |
| `shift_sessions` | Real-time clock-in/out sessions with pay calculations |
| `shift_events` | Immutable event log for all shift transitions |
| `timesheet_adjustment_requests` | Employee correction requests for shifts |
| `offline_action_receipts` | Idempotency receipts for QR-based offline clock-in/out |

### Payroll

| Table | Purpose |
|---|---|
| `company_pay_rules` | Overtime, double-time, and break rules configuration |
| `shift_allowances` | Per-shift allowances (travel, meal, parking, site, other) |
| `payroll_export_batches` | Exported payroll batch records |

### Quotes

| Table | Purpose |
|---|---|
| `quote_requests` | Quote request submissions linked to leads or projects |
| `quotes` | Professional quotes with pricing, terms, and status workflow |
| `quote_items` | Line items within a quote |
| `quote_sections` | Grouped sections within a quote |
| `quote_status_history` | Status change audit log for quotes |
| `quote_documents` | Generated PDF documents per quote revision |
| `quote_review_events` | Review workflow event log |
| `quote_templates` | Reusable quote templates (seeded with defaults) |
| `quote_template_items` | Line items within quote templates |

### Auth & Invites

| Table | Purpose |
|---|---|
| `password_reset_tokens` | Password reset flow tokens |
| `user_invite_tokens` | User invitation tokens for role-based account creation |

### Maintenance

| Table | Purpose |
|---|---|
| `maintenance_tickets` | Maintenance/defect request tickets per project |

### Documents

| Table | Purpose |
|---|---|
| `document_folders` | Virtual folder structure for documents (per entity type) |
| `documents` | File metadata with visibility scoping (internal/client) |

### Proposals

| Table | Purpose |
|---|---|
| `proposal_templates` | Reusable proposal body templates |
| `proposal_versions` | Versioned proposals linked to quotes |

### Notifications

| Table | Purpose |
|---|---|
| `notifications` | In-app notification queue per user |
| `notification_preferences` | Per-user notification toggles |
| `reminder_rules` | Configurable reminder triggers |
| `reminder_runs` | Execution log of reminder rules |

## Key Relationships (Foreign Keys)

- `sessions.user_id` → `users(id)` ON DELETE CASCADE
- `leads.assigned_to` → `users(id)`
- `projects.client_id` → `users(id)`
- `timesheets.user_id` → `users(id)`, `timesheets.project_id` → `projects(id)`, `timesheets.approved_by` → `users(id)`
- `shift_sessions.employee_id` → `users(id)`, `shift_sessions.site_id` → `work_sites(id)`
- `shift_events.shift_session_id` → `shift_sessions(id)` ON DELETE CASCADE
- `quotes.quote_request_id` → `quote_requests(id)` ON DELETE CASCADE
- `quote_items.quote_id` → `quotes(id)` ON DELETE CASCADE
- `notifications.user_id` → `users(id)` ON DELETE CASCADE
- `contact_requests.assigned_to_user_id` → `users(id)`

## Indexes

Every foreign key column and frequently filtered column is indexed. Key indexes include:

- `idx_sessions_user_id`, `idx_sessions_expires` — session lookups and expiry sweeps
- `idx_audit_logs_created`, `idx_audit_logs_user`, `idx_audit_logs_entity` — audit trail queries
- `idx_timesheets_user`, `idx_timesheets_project` — timesheet filtering
- `idx_shift_sessions_employee`, `idx_shift_sessions_status` — shift management
- `idx_shift_events_session`, `idx_shift_events_employee` — shift event queries
- `idx_leads_status`, `idx_projects_status` — pipeline filtering
- `idx_contact_requests_status`, `idx_contact_requests_email`, `idx_contact_requests_phone`
- `idx_quotes_status`, `idx_quotes_quote_number` (UNIQUE), `idx_quotes_client_email`
- `idx_notifications_user`, `idx_notifications_status` — notification queries
- `idx_work_sites_qr_token` (UNIQUE) — QR-based clock-in lookups

## Migration Strategy

The database uses **versioned migrations** stored in `server/db/migrations/`. Each file exports `version`, `name`, and `migrate(db)`.

Migrations are idempotent — they use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and check `schema_migrations` before applying. This makes them safe to run multiple times.

### Migration Files

| File | Version | Purpose |
|---|---|---|
| `001-initial-schema.js` | 001 | Creates `schema_migrations`, `users`, `sessions`, `leads`, `projects`, `timesheets`, `maintenance_tickets`, `audit_logs` + indexes |
| `002-auth-invites.js` | 002 | `password_reset_tokens`, `user_invite_tokens` |
| `003-client-portal.js` | 003 | `client_project_access`, `project_updates`, `project_update_comments`, `project_variations`, `client_portal_messages` |
| `004-realtime-timesheets.js` | 004 | `work_sites`, `shift_sessions`, `shift_events`, `timesheet_adjustment_requests` + column migrations |
| `005-pay-rules.js` | 005 | `company_pay_rules`, `shift_allowances`, `payroll_export_batches`, `offline_action_receipts` |
| `006-platform-modules.js` | 006 | Lead activities, followups, quotes, tasks, documents, proposals, notifications, reminders + users table expansion |
| `007-contact-requests.js` | 007 | `contact_requests` table |
| `008-professional-quotes.js` | 008 | Quote builder upgrades: sections, professional fields, templates, review events |
| `009-email-jobs.js` | 009 | `email_jobs` table for tracking automated transactional email delivery |

### `schema_migrations` Table

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
```

Each migration inserts a row upon successful application:

```sql
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('008', 'professional-quotes', datetime('now'));
```

The migration runner (`server/db/versioned-migrate.js`) reads files from `server/db/migrations/`, sorts them alphabetically, checks `schema_migrations` for each version, and skips already-applied migrations.

## How to Run Migrations

```bash
npm run db:migrate
```

This runs the `db:migrate` script defined in `package.json`, which executes `server/db/migrate.js`. The script first ensures the `schema_migrations` table exists, then runs all pending versioned migrations, and falls back to a legacy monolithic migration if no versioned migrations have been applied.
