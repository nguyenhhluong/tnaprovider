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
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, "../../data/tna.db");

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

// GET /api/admin-tools/health
router.get(
  "/health",
  requireAuth,
  requirePasswordChanged,
  requireRole("owner", "admin"),
  (req, res) => {
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
        path: DB_PATH.replace(/^.*[\/\\]/, "…/"),
      },
      timestamp: new Date().toISOString(),
    });
  }
);

// GET /api/admin-tools/storage
router.get(
  "/storage",
  requireAuth,
  requirePasswordChanged,
  requireRole("owner", "admin"),
  (req, res) => {
    ensureBackupDir();

    let dbSize = 0;
    try { dbSize = fs.statSync(DB_PATH).size; } catch {}

    let backupSize = 0;
    let backupCount = 0;
    try {
      const files = fs.readdirSync(BACKUP_DIR);
      backupCount = files.length;
      backupSize = files.reduce((sum, f) => {
        try { return sum + fs.statSync(path.join(BACKUP_DIR, f)).size; } catch { return sum; }
      }, 0);
    } catch {}

    const total = dbSize + backupSize;

    res.json({
      database: {
        sizeBytes: dbSize,
        sizeFormatted: formatBytes(dbSize),
      },
      backups: {
        count: backupCount,
        totalSizeBytes: backupSize,
        totalSizeFormatted: formatBytes(backupSize),
        path: BACKUP_DIR.replace(/^.*[\/\\]/, "…/"),
      },
      total: {
        sizeBytes: total,
        sizeFormatted: formatBytes(total),
      },
    });
  }
);

// POST /api/admin-tools/backups (owner only)
router.post(
  "/backups",
  requireAuth,
  requirePasswordChanged,
  requireRole("owner"),
  (req, res) => {
    ensureBackupDir();

    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const filename = `tna-db-backup-${ts}.sqlite`;
    const dest = path.join(BACKUP_DIR, filename);

    try {
      if (!fs.existsSync(DB_PATH)) {
        return res.status(500).json({ error: "Database file not found" });
      }
      fs.copyFileSync(DB_PATH, dest);
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
  }
);

// GET /api/admin-tools/backups (owner only)
router.get(
  "/backups",
  requireAuth,
  requirePasswordChanged,
  requireRole("owner"),
  (req, res) => {
    ensureBackupDir();

    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("tna-db-backup-") && f.endsWith(".sqlite"))
        .map((f) => {
          const stat = fs.statSync(path.join(BACKUP_DIR, f));
          return {
            filename: f,
            sizeBytes: stat.size,
            sizeFormatted: formatBytes(stat.size),
            createdAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(files);
    } catch (err) {
      console.error("List backups error:", err.message);
      res.status(500).json({ error: "Failed to list backups" });
    }
  }
);

// GET /api/admin-tools/backups/:filename/download (owner only)
router.get(
  "/backups/:filename/download",
  requireAuth,
  requirePasswordChanged,
  requireRole("owner"),
  (req, res) => {
    const { filename } = req.params;

    // Path traversal protection
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\") || filename.includes("%")) {
      return res.status(403).json({ error: "Invalid filename" });
    }

    const filepath = path.join(BACKUP_DIR, filename);

    if (!isSafeBackupPath(filename)) {
      return res.status(404).json({ error: "Backup not found" });
    }

    if (!filename.startsWith("tna-db-backup-") || !filename.endsWith(".sqlite")) {
      return res.status(403).json({ error: "Invalid backup file" });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(filepath);
  }
);

function safeExport(res, filename, headers, query) {
  try {
    const db = getDb();
    const rows = db.prepare(query).all();
    sendCsv(res, filename, headers, rows);
  } catch (err) {
    // Table may not exist in this DB version — return empty CSV
    sendCsv(res, filename, headers, []);
  }
}

// CSV exports

// GET /api/admin-tools/export/users.csv
router.get("/export/users.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "users.csv", ["id", "email", "name", "role", "status", "must_change_password", "last_login_at", "created_at"],
    "SELECT id, email, name, role, status, must_change_password, last_login_at, created_at FROM users ORDER BY created_at DESC");
});

// GET /api/admin-tools/export/leads.csv
router.get("/export/leads.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "leads.csv", ["id", "company_name", "contact_name", "email", "phone", "source", "status", "score", "notes", "created_at", "updated_at"],
    "SELECT id, company_name, contact_name, email, phone, source, status, score, notes, created_at, updated_at FROM leads ORDER BY created_at DESC");
});

// GET /api/admin-tools/export/projects.csv
router.get("/export/projects.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "projects.csv", ["id", "name", "client_name", "status", "stage", "estimated_hours", "actual_hours", "location", "start_date", "end_date", "created_at"],
    "SELECT id, name, client_name, status, stage, estimated_hours, actual_hours, location, start_date, end_date, created_at FROM projects ORDER BY created_at DESC");
});

// GET /api/admin-tools/export/timesheets.csv
router.get("/export/timesheets.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "timesheets.csv", ["id", "user_id", "user_name", "project_id", "date", "hours", "description", "status", "created_at"],
    "SELECT t.id, t.user_id, u.name as user_name, t.project_id, t.date, t.hours, t.description, t.status, t.created_at FROM timesheets t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC");
});

// GET /api/admin-tools/export/maintenance.csv
router.get("/export/maintenance.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "maintenance.csv", ["id", "title", "description", "status", "priority", "reported_by", "assigned_to", "created_at", "updated_at"],
    "SELECT id, title, description, status, priority, reported_by, assigned_to, created_at, updated_at FROM maintenance ORDER BY created_at DESC");
});

// GET /api/admin-tools/export/audit-logs.csv
router.get("/export/audit-logs.csv", requireAuth, requirePasswordChanged, requireRole("owner", "admin"), (req, res) => {
  safeExport(res, "audit-logs.csv", ["id", "user_id", "user_name", "action", "entity_type", "entity_id", "ip_address", "created_at"],
    "SELECT id, user_id, user_name, action, entity_type, entity_id, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10000");
});

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Catch-all for unmatched admin-tools paths — return 404, not SPA
router.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default router;
