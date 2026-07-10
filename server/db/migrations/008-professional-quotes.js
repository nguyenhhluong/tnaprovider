import crypto from "crypto";

export const version = '008';
export const name = 'professional-quotes';
export const requiresForeignKeysOff = true;
export function migrate(db) {

  function addColumnIfMissing(table, column, definition) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  function getColumnNames(table) {
    return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  }

  const currentCheck = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='quotes'").get()?.sql || "";
  if (currentCheck.includes("CHECK(status IN") && !currentCheck.includes("in_review")) {
    const oldExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quotes_old'").get();
    if (oldExists) db.exec("DROP TABLE quotes_old");

    db.exec(`
      CREATE TABLE quotes_new (
        id TEXT PRIMARY KEY,
        quote_request_id TEXT,
        quote_number TEXT NOT NULL,
        title TEXT NOT NULL,
        scope TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','sent','accepted','rejected','expired','converted')),
        subtotal REAL DEFAULT 0,
        gst REAL DEFAULT 0,
        total REAL DEFAULT 0,
        created_by TEXT,
        accepted_by TEXT,
        accepted_at TEXT,
        valid_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO quotes_new (id, quote_request_id, quote_number, title, scope, status, subtotal, gst, total, created_by, accepted_by, accepted_at, valid_until, created_at, updated_at)
        SELECT id, quote_request_id, quote_number, title, scope, status, subtotal, gst, total, created_by, accepted_by, accepted_at, valid_until, created_at, updated_at FROM quotes;
      DROP TABLE quotes;
      ALTER TABLE quotes_new RENAME TO quotes;
    `);
  }

  const qCols = getColumnNames('quotes');
  addColumnIfMissing('quotes', 'client_name', 'TEXT');
  addColumnIfMissing('quotes', 'client_email', 'TEXT');
  addColumnIfMissing('quotes', 'client_phone', 'TEXT');
  addColumnIfMissing('quotes', 'client_company', 'TEXT');
  addColumnIfMissing('quotes', 'client_address', 'TEXT');
  addColumnIfMissing('quotes', 'project_name', 'TEXT');
  addColumnIfMissing('quotes', 'project_location', 'TEXT');
  addColumnIfMissing('quotes', 'quote_date', 'TEXT');
  addColumnIfMissing('quotes', 'valid_until', 'TEXT');
  addColumnIfMissing('quotes', 'revision_number', 'INTEGER DEFAULT 1');
  addColumnIfMissing('quotes', 'currency', "TEXT DEFAULT 'AUD'");
  addColumnIfMissing('quotes', 'tax_rate', 'REAL DEFAULT 0.10');
  addColumnIfMissing('quotes', 'discount_type', "TEXT DEFAULT 'none'");
  addColumnIfMissing('quotes', 'discount_value', 'REAL DEFAULT 0');
  addColumnIfMissing('quotes', 'discount_total', 'REAL DEFAULT 0');
  addColumnIfMissing('quotes', 'margin_total', 'REAL DEFAULT 0');
  addColumnIfMissing('quotes', 'terms', 'TEXT');
  addColumnIfMissing('quotes', 'payment_terms', 'TEXT');
  addColumnIfMissing('quotes', 'inclusions', 'TEXT');
  addColumnIfMissing('quotes', 'exclusions', 'TEXT');
  addColumnIfMissing('quotes', 'warranty', 'TEXT');
  addColumnIfMissing('quotes', 'notes', 'TEXT');
  addColumnIfMissing('quotes', 'internal_notes', 'TEXT');
  addColumnIfMissing('quotes', 'review_status', "TEXT DEFAULT 'draft'");
  addColumnIfMissing('quotes', 'reviewed_by', 'TEXT');
  addColumnIfMissing('quotes', 'reviewed_at', 'TEXT');
  addColumnIfMissing('quotes', 'approved_by', 'TEXT');
  addColumnIfMissing('quotes', 'approved_at', 'TEXT');
  addColumnIfMissing('quotes', 'sent_at', 'TEXT');
  addColumnIfMissing('quotes', 'sent_to_email', 'TEXT');
  addColumnIfMissing('quotes', 'pdf_file_path', 'TEXT');
  addColumnIfMissing('quotes', 'pdf_generated_at', 'TEXT');
  addColumnIfMissing('quotes', 'public_token', 'TEXT');
  addColumnIfMissing('quotes', 'public_token_expires_at', 'TEXT');

  const qsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_sections'").get();
  if (!qsExists) {
    db.exec(`
      CREATE TABLE quote_sections (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        subtotal REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  const qiCols = getColumnNames('quote_items');
  addColumnIfMissing('quote_items', 'section_id', 'TEXT');
  addColumnIfMissing('quote_items', 'item_type', "TEXT DEFAULT 'material'");
  addColumnIfMissing('quote_items', 'item_code', 'TEXT');
  addColumnIfMissing('quote_items', 'unit_cost', 'REAL DEFAULT 0');
  addColumnIfMissing('quote_items', 'markup_percent', 'REAL DEFAULT 0');
  addColumnIfMissing('quote_items', 'discount_percent', 'REAL DEFAULT 0');
  addColumnIfMissing('quote_items', 'tax_rate', 'REAL DEFAULT 0.10');
  addColumnIfMissing('quote_items', 'taxable', 'INTEGER DEFAULT 1');
  addColumnIfMissing('quote_items', 'notes', 'TEXT');
  addColumnIfMissing('quote_items', 'name', 'TEXT');

  const qdExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_documents'").get();
  if (!qdExists) {
    db.exec(`
      CREATE TABLE quote_documents (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL DEFAULT 'pdf',
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        revision_number INTEGER DEFAULT 1,
        generated_by TEXT REFERENCES users(id),
        generated_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  const qreExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_review_events'").get();
  if (!qreExists) {
    db.exec(`
      CREATE TABLE quote_review_events (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        note TEXT,
        changed_by TEXT REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  const qtExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_templates'").get();
  if (!qtExists) {
    db.exec(`
      CREATE TABLE quote_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  const qtiExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_template_items'").get();
  if (!qtiExists) {
    db.exec(`
      CREATE TABLE quote_template_items (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
        section_title TEXT NOT NULL,
        description TEXT NOT NULL,
        unit TEXT DEFAULT 'each',
        unit_price REAL DEFAULT 0,
        item_type TEXT DEFAULT 'material',
        sort_order INTEGER DEFAULT 0
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_client_email ON quotes(client_email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_sections_quote ON quote_sections(quote_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_items_section ON quote_items(section_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_documents_quote ON quote_documents(quote_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_review_events_quote ON quote_review_events(quote_id)`);

  const templateCount = db.prepare("SELECT COUNT(*) as cnt FROM quote_templates").get().cnt;
  if (templateCount === 0) {
    const templates = [
      { name: "Commercial Fitout", items: [{ section: "Demolition & Strip Out", desc: "Strip out existing fitout — supply labour and skip bins", price: 0 }, { section: "New Partitions", desc: "Metal stud partition walls with one layer Fyrechek each side", price: 0 }, { section: "Ceiling", desc: "Suspended ceiling grid with acoustic tiles", price: 0 }, { section: "Flooring", desc: "Commercial grade carpet or vinyl plank flooring", price: 0 }, { section: "Paint", desc: "Premium interior paint to walls and ceiling (up to 2 coats)", price: 0 }, { section: "Electrical", desc: "Electrical rough-in and fit-off as per scope (allowance)", price: 0 }] },
      { name: "Joinery Supply & Install", items: [{ section: "Custom Cabinetry", desc: "Design, supply & install custom joinery per scope", price: 0 }, { section: "Benchtops", desc: "Engineered stone or laminate benchtop supply & install", price: 0 }, { section: "Hardware", desc: "Handles, hinges, drawer runners (soft-close as specified)", price: 0 }, { section: "Delivery & Installation", desc: "Delivery to site, installation, protection, and clean", price: 0 }] },
      { name: "Maintenance Works", items: [{ section: "General Repairs", desc: "General building maintenance repairs (labour per hour)", price: 0 }, { section: "Plumbing", desc: "Plumbing repairs including tap/valve/pipe work (labour per hour)", price: 0 }, { section: "Electrical", desc: "Electrical repairs including switch/light/power (labour per hour)", price: 0 }, { section: "Carpentry", desc: "Carpentry repairs including door/hinge/frame adjustments (labour per hour)", price: 0 }] },
      { name: "Labour Hire / Day Works", items: [{ section: "Carpenter", desc: "Qualified carpenter — labour only per day (8 hours)", price: 0 }, { section: "Leading Hand", desc: "Leading hand / supervisor — labour only per day (8 hours)", price: 0 }, { section: "Labourer", desc: "General labourer — labour only per day (8 hours)", price: 0 }, { section: "Travel", desc: "Travel allowance per km outside 30km radius (applicable at cost)", price: 0 }] },
      { name: "Supply Only", items: [{ section: "Materials", desc: "Supply of materials as per scope (call for itemised pricing)", price: 0 }, { section: "Delivery", desc: "Delivery to site within metropolitan area", price: 0 }] },
    ];
    const tplInsert = db.prepare("INSERT INTO quote_templates (id, name, description, category, is_default) VALUES (?, ?, ?, ?, ?)");
    const tplItemInsert = db.prepare("INSERT INTO quote_template_items (id, template_id, section_title, description, unit, unit_price, item_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for (const t of templates) {
      const tplId = crypto.randomUUID();
      tplInsert.run(tplId, t.name, `${t.name} template`, t.name, 0);
      t.items.forEach((item, i) => {
        tplItemInsert.run(crypto.randomUUID(), tplId, item.section, item.desc, "each", item.price, "material", i);
      });
    }
  }

}
