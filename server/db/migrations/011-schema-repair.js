export const version = '011';
export const name = 'schema-repair';
export const requiresForeignKeysOff = true;
export function migrate(db) {
  // Save existing quotes indexes before potential table recreation
  var savedIdx = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='quotes' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'").all();

  // Repair quotes table: add missing foreign keys by recreating
  var quotesSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='quotes'").get()?.sql || "";
  if (quotesSql.indexOf("REFERENCES") === -1) {
    var existing = db.prepare("SELECT * FROM quotes LIMIT 0").columns().map(function(c) { return c.name; });
    var oldExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quotes_old'").get();
    if (oldExists) db.exec("DROP TABLE quotes_old");

    var colDefs = [];
    var idCol = 'id TEXT PRIMARY KEY';
    var otherCols = [];

    for (var i = 0; i < existing.length; i++) {
      var col = existing[i];
      var info = db.prepare("PRAGMA table_info('quotes')").all().find(function(c) { return c.name === col; });
      if (!info) continue;

      var parts = [info.name, info.type || 'TEXT'];
      if (info.pk) { colDefs.push(info.name + ' TEXT PRIMARY KEY'); continue; }
      if (info.notnull) parts.push('NOT NULL');
      if (info.dflt_value !== null) {
        var dv = info.dflt_value;
        if (dv.indexOf('(') === -1) {
          parts.push('DEFAULT ' + dv);
        } else {
          parts.push('DEFAULT (' + dv + ')');
        }
      }
      if (col === 'quote_request_id') parts.push('REFERENCES quote_requests(id) ON DELETE CASCADE');
      if (col === 'created_by') parts.push('REFERENCES users(id)');
      if (col === 'accepted_by') parts.push('REFERENCES users(id)');
      colDefs.push(parts.join(' '));
    }

    var createSql = 'CREATE TABLE quotes_new (' + colDefs.join(', ') + ')';
    db.exec(createSql);
    db.exec('INSERT INTO quotes_new SELECT * FROM quotes');
    db.exec('DROP TABLE quotes');
    db.exec('ALTER TABLE quotes_new RENAME TO quotes');

    // Recreate all previous indexes
    for (var j = 0; j < savedIdx.length; j++) {
      try { db.exec(savedIdx[j].sql); } catch (e) {}
    }
  }

  // Ensure all required quotes indexes exist
  var idxList = [
    { name: 'idx_quotes_request', col: 'quote_request_id' },
    { name: 'idx_quotes_status', col: 'status' },
    { name: 'idx_quotes_quote_number', col: 'quote_number', unique: true },
    { name: 'idx_quotes_client_email', col: 'client_email' },
    { name: 'idx_quotes_created_at', col: 'created_at' },
  ];
  var existingIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='quotes'").all().map(function(r) { return r.name; });
  var quoteCols = db.prepare("PRAGMA table_info('quotes')").all().map(function(c) { return c.name; });
  for (var k = 0; k < idxList.length; k++) {
    if (existingIdx.indexOf(idxList[k].name) === -1 && quoteCols.indexOf(idxList[k].col) !== -1) {
      var unique = idxList[k].unique ? 'UNIQUE INDEX' : 'INDEX';
      db.exec('CREATE ' + unique + ' IF NOT EXISTS ' + idxList[k].name + ' ON quotes(' + idxList[k].col + ')');
    }
  }

  // Add missing shift_events indexes
  var shiftTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='shift_events'").all();
  if (shiftTables.length > 0) {
    var shiftIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='shift_events'").all().map(function(r) { return r.name; });
    var shiftCols = db.prepare("PRAGMA table_info('shift_events')").all().map(function(c) { return c.name; });
    if (shiftIdx.indexOf('idx_shift_events_session') === -1 && shiftCols.indexOf('shift_session_id') !== -1) {
      db.exec('CREATE INDEX IF NOT EXISTS idx_shift_events_session ON shift_events(shift_session_id)');
    }
    if (shiftIdx.indexOf('idx_shift_events_employee') === -1 && shiftCols.indexOf('employee_id') !== -1) {
      db.exec('CREATE INDEX IF NOT EXISTS idx_shift_events_employee ON shift_events(employee_id)');
    }
  }
}
