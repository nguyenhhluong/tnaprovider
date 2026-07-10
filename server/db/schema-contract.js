export const EXPECTED_MIGRATIONS = [
  { version: "001", name: "initial-schema" },
  { version: "002", name: "auth-invites" },
  { version: "003", name: "client-portal" },
  { version: "004", name: "realtime-timesheets" },
  { version: "005", name: "pay-rules" },
  { version: "006", name: "platform-modules" },
  { version: "007", name: "contact-requests" },
  { version: "008", name: "professional-quotes" },
];

export const FKS = [
  { table: "quotes", from: "quote_request_id", ref: "quote_requests", to: "id", onDelete: "CASCADE" },
  { table: "quotes", from: "created_by", ref: "users", to: "id" },
  { table: "quotes", from: "accepted_by", ref: "users", to: "id" },
  { table: "users", from: "disabled_by", ref: "users", to: "id" },
  { table: "shift_events", from: "shift_session_id", ref: "shift_sessions", to: "id", onDelete: "CASCADE" },
  { table: "shift_events", from: "employee_id", ref: "users", to: "id" },
  { table: "quote_items", from: "quote_id", ref: "quotes", to: "id", onDelete: "CASCADE" },
];

export const INDEXES = [
  { table: "quotes", name: "idx_quotes_request" },
  { table: "quotes", name: "idx_quotes_status" },
  { table: "quotes", name: "idx_quotes_quote_number" },
  { table: "quotes", name: "idx_quotes_client_email" },
  { table: "quotes", name: "idx_quotes_created_at" },
  { table: "shift_events", name: "idx_shift_events_session" },
  { table: "shift_events", name: "idx_shift_events_employee" },
  { table: "work_sites", name: "idx_work_sites_qr_token" },
  { table: "quote_items", name: "idx_quote_items_quote" },
  { table: "quote_sections", name: "idx_quote_sections_quote" },
  { table: "quote_documents", name: "idx_quote_documents_quote" },
  { table: "quote_review_events", name: "idx_quote_review_events_quote" },
  { table: "contact_requests", name: "idx_contact_requests_status" },
  { table: "contact_requests", name: "idx_contact_requests_received_at" },
  { table: "contact_requests", name: "idx_contact_requests_email" },
  { table: "contact_requests", name: "idx_contact_requests_phone" },
];

export function verifySchemaContract(db) {
  const errors = [];

  // 1. Migration versions
  const applied = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
  for (const em of EXPECTED_MIGRATIONS) {
    const found = applied.find(a => a.version === em.version);
    if (!found) { errors.push(`Missing migration ${em.version} (${em.name})`); continue; }
    if (found.name !== em.name) errors.push(`Migration ${em.version}: expected name "${em.name}", got "${found.name}"`);
  }

  // 2. Foreign keys
  for (const fk of FKS) {
    const fkList = db.prepare(`PRAGMA foreign_key_list(${fk.table})`).all();
    const match = fkList.find(f => f.from === fk.from && f.table === fk.ref && f.to === fk.to);
    if (!match) errors.push(`Missing FK: ${fk.table}.${fk.from} → ${fk.ref}.${fk.to}`);
    else if (fk.onDelete && match.on_delete !== fk.onDelete) {
      errors.push(`FK ${fk.table}.${fk.from}: expected on_delete=${fk.onDelete}, got ${match.on_delete}`);
    }
  }

  // 3. Indexes
  for (const idx of INDEXES) {
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`).get(idx.name);
    if (!exists) errors.push(`Missing index: ${idx.name} on ${idx.table}`);
  }

  // 4. Unique constraints via index introspection
  const uniqueIndexes = ["idx_quotes_quote_number", "idx_work_sites_qr_token"];
  for (const name of uniqueIndexes) {
    const idx = db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND name=?`).get(name);
    if (idx && !idx.sql.toUpperCase().includes("UNIQUE")) {
      errors.push(`Index ${name} should be UNIQUE`);
    }
  }

  return errors;
}
