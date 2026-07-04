import { getDb } from "./database.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

export function seed() {
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  const name = process.env.SEED_OWNER_NAME;

  if (!email || !password || !name) {
    console.error("SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, and SEED_OWNER_NAME must be set");
    process.exit(1);
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

  if (existing) {
    console.log("Seed owner already exists, skipping");
    return;
  }

  const id = crypto.randomUUID();
  const password_hash = bcrypt.hashSync(password, 12);
  const now = new Date().toISOString();

  const hourlyRate = parseFloat(process.env.SEED_OWNER_HOURLY_RATE || "38.5");

  db.prepare(`
    INSERT INTO users (id, email, name, role, password_hash, hourly_rate, status, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', ?, ?, 'active', ?, ?)
  `).run(id, email, name, password_hash, hourlyRate, now, now);

  console.log(`Seeded owner user: ${email} (hourly rate: $${hourlyRate.toFixed(2)})`);

  // Seed default work site
  const existingSite = db.prepare("SELECT id FROM work_sites LIMIT 1").get();
  if (!existingSite) {
    const siteId = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO work_sites (id, name, address, timezone, created_at, updated_at)
      VALUES (?, ?, ?, 'Australia/Sydney', ?, ?)
    `).run(siteId, "TNA Provider Workshop", "Unit 6, 7-9 Gibbon St, Wetherill Park NSW 2164", now, now);
    console.log("Seeded default work site: TNA Provider Workshop");
  }

  console.log(`Seeded owner user: ${email}`);
}
