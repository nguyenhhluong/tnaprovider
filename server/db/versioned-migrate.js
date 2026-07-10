import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runVersionedMigrations(db) {
  const migrationsDir = MIGRATIONS_DIR;

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (files.length === 0) {
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);

    let migrationModule;
    try {
      migrationModule = await import(`file://${filePath}`);
    } catch (err) {
      console.error(`Failed to load migration ${file}:`, err.message);
      throw err;
    }

    const { version, name, migrate } = migrationModule;
    if (!version || !name || !migrate) {
      console.warn(`Skipping invalid migration file: ${file}`);
      continue;
    }

    const alreadyApplied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (alreadyApplied) continue;

    console.log(`Running migration ${version}: ${name}`);

    try {
      migrate(db);
      console.log(`Migration ${version} applied successfully`);
    } catch (err) {
      console.error(`Migration ${version} (${name}) failed:`, err.message);
      throw err;
    }
  }
}
