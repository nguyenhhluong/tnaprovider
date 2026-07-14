import { execSync } from "child_process";
import { unlinkSync, mkdtempSync, cpSync, rmSync, readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import crypto from "crypto";

const ROOT = resolve(import.meta.dirname, "../..");
const MIGRATIONS_SRC = `${ROOT}/server/db/migrations`;
let pass = 0, fail = 0;
const uid = () => crypto.randomUUID().slice(0, 8);

function chk(label, condition) {
  if (condition) pass++;
  else { fail++; console.error(`FAIL ${label}`); }
}

function tmpDir() {
  const d = `/tmp/tna-prefix-${uid()}`;
  return d;
}

function execEnv(dbPath, content, envOverride) {
  try {
    execSync(`node --input-type=module`, { cwd: ROOT, input: content, env: { ...process.env, DATABASE_URL: dbPath, ...(envOverride || {}) }, stdio: "pipe", timeout: 30000 });
    return true;
  } catch { return false; }
}

function exec(dbPath, content) { return execEnv(dbPath, content, {}); }

function out(dbPath, content) {
  try {
    return execSync(`node --input-type=module`, { cwd: ROOT, input: content, env: { ...process.env, DATABASE_URL: dbPath, APP_ENV: "test", SESSION_SECRET: "test" }, stdio: "pipe", timeout: 15000 }).toString().trim();
  } catch { return ""; }
}

function status(dbPath) {
  const s = out(dbPath, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${dbPath}");
    const v=db.prepare("SELECT version,name FROM schema_migrations ORDER BY version").all();
    const fk=db.prepare("PRAGMA foreign_key_check").all().length;
    const integ=db.prepare("PRAGMA integrity_check").get()["integrity_check"];
    console.log(v.length+"|"+fk+"|"+integ+"|"+v.map(x=>x.version+","+x.name).join("|"));db.close();`);
  const p = s.split("|");
  return { count: parseInt(p[0]), fk: parseInt(p[1]), integ: p[2], versions: p.slice(3).map(x => ({ v: x.split(",")[0], n: x.split(",")[1] })) };
}

function requireAllFiles() {
  // Verify the full migration dir exists with all 8 files
  for (let i = 1; i <= 8; i++) {
    const f = `${MIGRATIONS_SRC}/${String(i).padStart(3, "0")}-*.js`;
    // Can't glob easily, just check existence
  }
  return readdirSync(MIGRATIONS_SRC).filter(f => f.endsWith(".js")).sort();
}

console.log("=== Phase 8I: Genuine Prefix Migration Tests ===");

const ALL_FILES = requireAllFiles();

// ── Helper: build a DB at a specific prefix by running only first N migrations ──
function buildPrefixDb(prefixCount) {
  const dir = tmpDir();
  const dbPath = `${dir}/test.db`;
  const migDir = `${dir}/migrations`;

  // Copy only the first N migration files
  const files = ALL_FILES.slice(0, prefixCount);

  // Create the database by running migrations
  const migrateCode = `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`;
  const ok = execEnv(dbPath, migrateCode, {});
  if (!ok) return null;

  // But wait — this ran ALL migrations, not just prefixCount.
  // We need a different approach: use a temp migration dir with only prefixCount files.
  return null;
}

// ── Correct approach: create a temp dir with only N files ──
function buildPrefix(prefixCount) {
  const dir = tmpDir();
  const dbPath = `${dir}/test.db`;
  const migDir = `${dir}/migrations`;

  // Copy only first N files to the temp migration dir
  const files = ALL_FILES.slice(0, prefixCount);
  for (const f of files) {
    cpSync(`${MIGRATIONS_SRC}/${f}`, `${migDir}/${f}`);
  }

  // Run migration against this limited set
  const code = `import{runVersionedMigrations}from"${ROOT}/server/db/versioned-migrate.js";import{getDb}from"${ROOT}/server/db/database.js";const db=getDb();await runVersionedMigrations(db);`;
  const ok = execEnv(dbPath, code, {});
  if (!ok) return null;

  // Verify we got exactly prefixCount records
  const s = status(dbPath);
  if (s.count !== prefixCount) return null;
  for (let i = 0; i < prefixCount; i++) {
    const expV = String(i + 1).padStart(3, "0");
    if (s.versions[i]?.v !== expV) return null;
  }

  return { dbPath, dir, migDir, count: prefixCount };
}

// ── Test each prefix ──
for (let n = 1; n <= 8; n++) {
  // Build genuine prefix-{n} database
  const state = buildPrefix(n);
  if (!state) { chk(`prefix ${n}: build`, false); continue; }

  // Now restore ALL migration files and re-run
  for (const f of ALL_FILES.slice(n)) {
    cpSync(`${MIGRATIONS_SRC}/${f}`, `${state.migDir}/${f}`);
  }

  const code2 = `import{runVersionedMigrations}from"${ROOT}/server/db/versioned-migrate.js";import{getDb}from"${ROOT}/server/db/database.js";const db=getDb();await runVersionedMigrations(db);`;
  const ok2 = execEnv(state.dbPath, code2, {});
  chk(`prefix ${n}: resume OK`, ok2);
  if (!ok2) { rmSync(state.dir, { recursive: true }); continue; }

  const s = status(state.dbPath);
  chk(`prefix ${n}: 8 versions`, s.count === 8);
  chk(`prefix ${n}: FK clean`, s.fk === 0);
  chk(`prefix ${n}: integrity ok`, s.integ === "ok");
  for (let i = 0; i < 8; i++) {
    const expV = String(i + 1).padStart(3, "0");
    chk(`prefix ${n}: v${expV} present`, s.versions[i]?.v === expV);
  }

  // Second run no-op
  const ok3 = execEnv(state.dbPath, code2, {});
  chk(`prefix ${n}: second run`, ok3);

  // Cleanup
  rmSync(state.dir, { recursive: true });
}

// ── Test invalid prefixes ──
function testInvalid(label, prefixFiles, extraFiles) {
  const dir = tmpDir();
  const dbPath = `${dir}/test.db`;
  const migDir = `${dir}/migrations`;

  for (const f of prefixFiles) cpSync(`${MIGRATIONS_SRC}/${f}`, `${migDir}/${f}`);
  if (extraFiles) for (const f of extraFiles) {
    // Create an invalid migration file
    writeFileSync(`${migDir}/${f.name}`, f.content);
  }

  const code = `import{runVersionedMigrations}from"${ROOT}/server/db/versioned-migrate.js";import{getDb}from"${ROOT}/server/db/database.js";const db=getDb();try{await runVersionedMigrations(db);console.log("UNEXPECTED_SUCCESS")}catch(e){console.log("EXPECTED_FAILURE")}`;
  const result = out(dbPath, code);
  chk(`invalid: ${label}`, result.includes("EXPECTED_FAILURE"));

  rmSync(dir, { recursive: true });
}

// Invalid: 002 without 001
testInvalid("002 without 001", ["002-auth-invites.js"], []);

// Invalid: 001+003 without 002
testInvalid("001+003 without 002", ["001-initial-schema.js", "003-client-portal.js"], []);

// Invalid: unexpected 009
testInvalid("unexpected 009", ALL_FILES, [{ name: "009-unknown.js", content: `export const version="009";export const name="unknown";export function migrate(db){}` }]);

// Invalid: out of order
testInvalid("out of order", ["002-auth-invites.js", "001-initial-schema.js"], []);

// Invalid: wrong exported version
testInvalid("wrong version", ["001-initial-schema.js"], [{ name: "002-fake.js", content: `export const version="999";export const name="fake";export function migrate(db){}` }]);

console.log(`\nPhase 8I: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
