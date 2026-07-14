export const EXPECTED_MIGRATIONS = [
  { version: "001", name: "initial-schema" },
  { version: "002", name: "auth-invites" },
  { version: "003", name: "client-portal" },
  { version: "004", name: "realtime-timesheets" },
  { version: "005", name: "pay-rules" },
  { version: "006", name: "platform-modules" },
  { version: "007", name: "contact-requests" },
  { version: "008", name: "professional-quotes" },
  { version: "009", name: "email-jobs" },
];

const TABLES = {
  users: { cols: ["id","email","name","role","password_hash","status","must_change_password","invited_at","disabled_at","disabled_by","password_changed_at","hourly_rate","created_at","updated_at","last_login_at"], checks: ["role","status"] },
  sessions: { cols: ["id","user_id","session_hash","expires_at","created_at","revoked_at"] },
  leads: { cols: ["id","name","email","phone","company","project_type","location","budget","message","score","temperature","status","source","assigned_to","created_at","updated_at"] },
  projects: { cols: ["id","title","client_name","client_id","status","sector","location","budget","start_date","target_date","created_at","updated_at"] },
  quote_requests: { cols: ["id","lead_id","project_id","title","scope","location","budget","target_date","status","requested_by","created_by","created_at","updated_at"] },
  quotes: { cols: ["id","quote_request_id","quote_number","title","scope","status","subtotal","gst","total","discount_total","created_by","accepted_by","accepted_at","valid_until","client_name","client_email","client_phone","client_company","client_address","project_name","project_location","quote_date","revision_number","currency","tax_rate","discount_type","discount_value","margin_total","terms","payment_terms","inclusions","exclusions","warranty","notes","internal_notes","review_status","reviewed_by","reviewed_at","approved_by","approved_at","sent_at","sent_to_email","pdf_file_path","pdf_generated_at","public_token","public_token_expires_at","created_at","updated_at"], checks: ["status"] },
  shift_sessions: { cols: ["id","employee_id","site_id","status","checked_in_at","checked_out_at","total_seconds","break_seconds","payable_seconds","estimated_gross_pay","final_gross_pay","hourly_rate_snapshot","timezone","base_seconds","overtime_seconds","double_time_seconds","base_pay","overtime_pay","double_time_pay","allowance_pay","payroll_exported_at","payroll_export_batch_id","created_at","updated_at"], checks: ["status"] },
  shift_events: { cols: ["id","shift_session_id","employee_id","event_type","event_time","source","created_at"], checks: ["event_type","source"] },
  work_sites: { cols: ["id","name","address","latitude","longitude","timezone","is_active","qr_token","qr_enabled","default_allowance_cents","created_at","updated_at"] },
  contact_requests: { cols: ["id","first_name","last_name","email","phone","service","location","budget","target_date","message","request_callback","callback_time","privacy_consent","project_id","source","status","priority","internal_notes","assigned_to_user_id","last_contacted_at","archived_at","converted_lead_id","received_at","created_at","updated_at"] },
  quote_sections: { cols: ["id","quote_id","title","description","sort_order","subtotal","created_at","updated_at"] },
  quote_items: { cols: ["id","quote_id","section_id","name","description","quantity","unit","item_type","unit_cost","unit_price","markup_percent","discount_percent","tax_rate","taxable","sort_order","notes","total"] },
  quote_documents: { cols: ["id","quote_id","document_type","file_name","file_path","revision_number","generated_by","generated_at","created_at"] },
  quote_review_events: { cols: ["id","quote_id","from_status","to_status","note","changed_by","created_at"] },
  quote_templates: { cols: ["id","name","description","category","is_default","created_at","updated_at"] },
  quote_template_items: { cols: ["id","template_id","section_title","description","unit","unit_price","item_type","sort_order"] },
  email_jobs: { cols: ["id","type","recipient","subject","related_entity_type","related_entity_id","payload_json","status","attempt_count","last_error","smtp_message_id","scheduled_at","sent_at","created_at","updated_at"], checks: ["status","type"] },
};

const CRITICAL_COLUMNS = [
  { table: "users", column: "hourly_rate" },
  { table: "users", column: "must_change_password" },
  { table: "users", column: "invited_at" },
  { table: "users", column: "disabled_at" },
  { table: "users", column: "disabled_by" },
  { table: "work_sites", column: "qr_token" },
  { table: "shift_sessions", column: "base_seconds" },
  { table: "shift_sessions", column: "overtime_seconds" },
  { table: "shift_sessions", column: "double_time_seconds" },
  { table: "shift_sessions", column: "base_pay" },
  { table: "shift_sessions", column: "overtime_pay" },
  { table: "shift_sessions", column: "double_time_pay" },
  { table: "quotes", column: "quote_number" },
  { table: "quotes", column: "client_email" },
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
  { table: "quotes", name: "idx_quotes_request", columns: ["quote_request_id"], unique: false },
  { table: "quotes", name: "idx_quotes_status", columns: ["status"], unique: false },
  { table: "quotes", name: "idx_quotes_quote_number", columns: ["quote_number"], unique: true },
  { table: "quotes", name: "idx_quotes_client_email", columns: ["client_email"], unique: false },
  { table: "quotes", name: "idx_quotes_created_at", columns: ["created_at"], unique: false },
  { table: "shift_events", name: "idx_shift_events_session", columns: ["shift_session_id"], unique: false },
  { table: "shift_events", name: "idx_shift_events_employee", columns: ["employee_id"], unique: false },
  { table: "work_sites", name: "idx_work_sites_qr_token", columns: ["qr_token"], unique: true },
  { table: "quote_items", name: "idx_quote_items_quote", columns: ["quote_id"], unique: false },
  { table: "quote_sections", name: "idx_quote_sections_quote", columns: ["quote_id"], unique: false },
  { table: "quote_documents", name: "idx_quote_documents_quote", columns: ["quote_id"], unique: false },
  { table: "quote_review_events", name: "idx_quote_review_events_quote", columns: ["quote_id"], unique: false },
  { table: "contact_requests", name: "idx_contact_requests_status", columns: ["status"], unique: false },
  { table: "contact_requests", name: "idx_contact_requests_received_at", columns: ["received_at"], unique: false },
  { table: "contact_requests", name: "idx_contact_requests_email", columns: ["email"], unique: false },
  { table: "contact_requests", name: "idx_contact_requests_phone", columns: ["phone"], unique: false },
  { table: "email_jobs", name: "idx_email_jobs_status", columns: ["status"], unique: false },
  { table: "email_jobs", name: "idx_email_jobs_type", columns: ["type"], unique: false },
  { table: "email_jobs", name: "idx_email_jobs_related", columns: ["related_entity_type","related_entity_id"], unique: false },
  { table: "email_jobs", name: "idx_email_jobs_scheduled", columns: ["scheduled_at"], unique: false },
];

const CHECK_CONSTRAINTS = {
  users: { role: "'owner','admin','manager','worker','client'", status: "'active','disabled','invited'" },
  shift_sessions: { status: "'active','on_break','pending_approval','approved','rejected','auto_closed','correction_requested'" },
  shift_events: { event_type: "'check_in','break_start','break_end','check_out','auto_check_out','correction_requested','admin_approved','admin_rejected'", source: "'web','mobile','kiosk','admin','system','qr','offline_qr'" },
  quotes: { status: "'draft','in_review','approved','sent','accepted','rejected','expired','converted'" },
  email_jobs: { status: "'PENDING','PROCESSING','SENT','FAILED','CANCELLED'", type: "'QUOTE_RECEIVED_CUSTOMER','QUOTE_RECEIVED_ADMIN','USER_INVITATION','PASSWORD_RESET','QUOTE_STATUS_CHANGED'" },
};

export function verifySchemaContract(db, appliedOverride) {
  const errors = [];
  const raw = appliedOverride || db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();

  // Determine how many migrations to expect: if override is provided, it may be partial (used during migration)
  const expectedCount = appliedOverride ? appliedOverride.length : EXPECTED_MIGRATIONS.length;
  const expectedSlice = EXPECTED_MIGRATIONS.slice(0, expectedCount);

  if (raw.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} migrations, found ${raw.length}`);
  } else {
    for (let i = 0; i < expectedCount; i++) {
      const a = raw[i];
      const e = expectedSlice[i];
      if (a.version !== e.version) errors.push(`Migration ${i + 1}: version ${a.version}, expected ${e.version}`);
      if (a.name !== e.name) errors.push(`Migration ${i + 1} (${a.version}): name "${a.name}", expected "${e.name}"`);
    }
  }

  // 2. Required tables
  for (const [table, def] of Object.entries(TABLES)) {
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) { errors.push(`Missing table: ${table}`); continue; }

    const actualCols = db.prepare(`PRAGMA table_info(${table})`).all();
    const actualNames = actualCols.map(c => c.name);

    // 3. Required columns
    for (const col of def.cols) {
      if (!actualNames.includes(col)) errors.push(`Missing column: ${table}.${col}`);
    }

    // 4. Critical columns
    for (const cc of CRITICAL_COLUMNS) {
      if (cc.table === table && !actualNames.includes(cc.column)) {
        errors.push(`Missing critical column: ${table}.${cc.column}`);
      }
    }

    // 5. CHECK constraints
    if (def.checks) {
      const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table)?.sql || "";
      for (const checkCol of def.checks) {
        const expectedVals = CHECK_CONSTRAINTS[table]?.[checkCol];
        if (expectedVals && !sql.includes(expectedVals)) {
          errors.push(`Table ${table} CHECK on ${checkCol} missing or weakened: expected values including ${expectedVals}`);
        }
      }
    }
  }

  // 6. Foreign keys
  for (const fk of FKS) {
    const fkList = db.prepare(`PRAGMA foreign_key_list(${fk.table})`).all();
    const match = fkList.find(f => f.from === fk.from && f.table === fk.ref && f.to === fk.to);
    if (!match) errors.push(`Missing FK: ${fk.table}.${fk.from} → ${fk.ref}.${fk.to}`);
    else if (fk.onDelete && match.on_delete !== fk.onDelete) {
      errors.push(`FK ${fk.table}.${fk.from}: expected on_delete=${fk.onDelete}, got ${match.on_delete}`);
    }
  }

  // 7. Indexes with column and uniqueness verification
  for (const idx of INDEXES) {
    const idxInfo = db.prepare("SELECT * FROM sqlite_master WHERE type='index' AND name=?").get(idx.name);
    if (!idxInfo) { errors.push(`Missing index: ${idx.name}`); continue; }
    if (idxInfo.tbl_name !== idx.table) errors.push(`Index ${idx.name}: table ${idxInfo.tbl_name}, expected ${idx.table}`);

    // Check uniqueness
    if (idx.unique && !idxInfo.sql?.toUpperCase().includes("UNIQUE")) {
      errors.push(`Index ${idx.name} should be UNIQUE`);
    }

    // Check indexed columns and order
    const colInfo = db.prepare(`PRAGMA index_info(${idx.name})`).all().sort((a, b) => a.seqno - b.seqno);
    const colNames = colInfo.map(c => c.name);
    const expectedCols = idx.columns;
    if (colNames.length !== expectedCols.length || !expectedCols.every((c, i) => colNames[i] === c)) {
      errors.push(`Index ${idx.name}: columns [${colNames.join(",")}], expected [${expectedCols.join(",")}]`);
    }
  }

  return errors;
}
