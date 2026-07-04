import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const BACKUP_DIR = path.join(__dirname, "../../data/backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sendCsv(res, filename, headers, rows) {
  const headerLine = headers.map(escapeCsv).join(",");
  const dataLines = rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","));
  const csv = [headerLine, ...dataLines].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

function isSafeBackupPath(filepath) {
  const resolved = path.resolve(BACKUP_DIR, filepath);
  return resolved.startsWith(BACKUP_DIR) && fs.existsSync(resolved) && fs.statSync(resolved).isFile();
}

function tableExists(db, tableName) {
  return Boolean(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName)
  );
}

function safeExport(res, filename, headers, query, tableName) {
  try {
    const db = getDb();
    if (tableName && !tableExists(db, tableName)) {
      // Missing optional table — return header-only CSV, not an error
      return sendCsv(res, filename, headers, []);
    }
    const rows = db.prepare(query).all();
    sendCsv(res, filename, headers, rows);
  } catch (err) {
    console.error(`CSV export error (${filename}):`, err.message);
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
}

// GET /api/admin-tools/health
router.get("/health", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  const sessionCount = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE revoked_at IS NULL AND expires_at > datetime('now')").get();
  const auditCount = db.prepare("SELECT COUNT(*) as count FROM audit_logs").get();

  res.json({
    status: "healthy",
    uptime: process.uptime(),
    nodeVersion: process.version,
    database: {
      users: userCount.count,
      activeSessions: sessionCount.count,
      auditEntries: auditCount.count,
    },
    timestamp: new Date().toISOString(),
  });
});

// GET /api/admin-tools/storage
router.get("/storage", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  ensureBackupDir();
  const dbPath = process.env.DATABASE_URL || path.join(__dirname, "../../data/tna.db");

  let dbSize = 0;
  try { dbSize = fs.statSync(dbPath).size; } catch {}

  let backupSize = 0;
  let backupCount = 0;
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    backupCount = files.length;
    backupSize = files.reduce((sum, f) => {
      try { return sum + fs.statSync(path.join(BACKUP_DIR, f)).size; } catch { return sum; }
    }, 0);
  } catch {}

  res.json({
    database: { sizeBytes: dbSize, sizeFormatted: formatBytes(dbSize) },
    backups: { count: backupCount, totalSizeBytes: backupSize, totalSizeFormatted: formatBytes(backupSize) },
    total: { sizeBytes: dbSize + backupSize, sizeFormatted: formatBytes(dbSize + backupSize) },
  });
});

// POST /api/admin-tools/backups (owner only) — uses SQLite VACUUM INTO for safe live backup
router.post("/backups", requireAuth, requirePasswordChanged, requireRole("owner"), (req, res) => {
  ensureBackupDir();

  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const filename = `tna-db-backup-${ts}.sqlite`;
  const dest = path.join(BACKUP_DIR, filename);

  try {
    const db = getDb();
    const safeDest = dest.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${safeDest}'`);

    const stats = fs.statSync(dest);
    res.json({
      message: "Backup created",
      filename,
      sizeBytes: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Backup error:", err.message);
    res.status(500).json({ error: "Failed to create backup" });
  }
});

// GET /api/admin-tools/backups (owner only)
router.get("/backups", requireAuth, requirePasswordChanged, requireRole("owner"), (req, res) => {
  ensureBackupDir();

  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("tna-db-backup-") && f.endsWith(".sqlite"))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, sizeBytes: stat.size, sizeFormatted: formatBytes(stat.size), createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(files);
  } catch (err) {
    console.error("List backups error:", err.message);
    res.status(500).json({ error: "Failed to list backups" });
  }
});

// GET /api/admin-tools/backups/:filename/download (owner only)
router.get("/backups/:filename/download", requireAuth, requirePasswordChanged, requireRole("owner"), (req, res) => {
  const { filename } = req.params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.includes("%")) {
    return res.status(403).json({ error: "Invalid filename" });
  }

  if (!filename.startsWith("tna-db-backup-") || !filename.endsWith(".sqlite")) {
    return res.status(403).json({ error: "Invalid backup file" });
  }

  if (!isSafeBackupPath(filename)) {
    return res.status(404).json({ error: "Backup not found" });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

// ── CSV exports ──

// GET /api/admin-tools/export/users.csv
router.get("/export/users.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "users.csv",
    ["id", "email", "name", "role", "status", "must_change_password", "last_login_at", "created_at"],
    "SELECT id, email, name, role, status, must_change_password, last_login_at, created_at FROM users ORDER BY created_at DESC",
    "users");
});

// GET /api/admin-tools/export/leads.csv
router.get("/export/leads.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "leads.csv",
    ["id", "name", "email", "phone", "company", "project_type", "location", "budget", "message", "score", "temperature", "status", "source", "assigned_to", "created_at", "updated_at"],
    "SELECT id, name, email, phone, company, project_type, location, budget, message, score, temperature, status, source, assigned_to, created_at, updated_at FROM leads ORDER BY created_at DESC",
    "leads");
});

// GET /api/admin-tools/export/projects.csv
router.get("/export/projects.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "projects.csv",
    ["id", "title", "client_name", "client_id", "status", "sector", "location", "budget", "start_date", "target_date", "created_at", "updated_at"],
    "SELECT id, title, client_name, client_id, status, sector, location, budget, start_date, target_date, created_at, updated_at FROM projects ORDER BY created_at DESC",
    "projects");
});

// GET /api/admin-tools/export/timesheets.csv
router.get("/export/timesheets.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "timesheets.csv",
    ["id", "user_id", "user_name", "project_id", "work_date", "start_time", "finish_time", "break_minutes", "total_hours", "status", "notes", "approved_by", "approved_at", "created_at", "updated_at"],
    `SELECT t.id, t.user_id, u.name AS user_name, t.project_id, t.work_date, t.start_time, t.finish_time, t.break_minutes, t.total_hours, t.status, t.notes, t.approved_by, t.approved_at, t.created_at, t.updated_at
     FROM timesheets t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC`,
    "timesheets");
});

// GET /api/admin-tools/export/maintenance.csv
router.get("/export/maintenance.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "maintenance.csv",
    ["id", "client_id", "client_name", "project_id", "title", "description", "priority", "status", "assigned_to", "created_at", "updated_at"],
    `SELECT mt.id, mt.client_id, u.name AS client_name, mt.project_id, mt.title, mt.description, mt.priority, mt.status, mt.assigned_to, mt.created_at, mt.updated_at
     FROM maintenance_tickets mt LEFT JOIN users u ON u.id = mt.client_id ORDER BY mt.created_at DESC`,
    "maintenance_tickets");
});

// GET /api/admin-tools/export/audit-logs.csv
router.get("/export/audit-logs.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "audit-logs.csv",
    ["id", "user_id", "user_name", "action", "entity_type", "entity_id", "ip_address", "created_at"],
    `SELECT a.id, a.user_id, u.name AS user_name, a.action, a.entity_type, a.entity_id, a.ip_address, a.created_at
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 10000`,
    "audit_logs");
});

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Catch-all for unmatched admin-tools paths
router.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default router;
