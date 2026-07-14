import { getDb } from "./database.js";
import { runVersionedMigrations } from "./versioned-migrate.js";

export async function migrate() {
  const db = getDb();

  // Run versioned migrations — preflight validates before any DB mutation
  await runVersionedMigrations(db);

  console.log("Database migrated successfully");
}
