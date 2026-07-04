import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function getDbPath() {
  return process.env.DATABASE_URL || path.join(__dirname, "../../data/tna.db");
}

let dbPath = null;
let db = null;

export function getDb() {
  const newPath = getDbPath();
  if (!db || newPath !== dbPath) {
    dbPath = newPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (db) { try { db.close(); } catch {} }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function closeDb() {
  if (db) {
    try { db.close(); } catch {}
    db = null;
    dbPath = null;
  }
}
