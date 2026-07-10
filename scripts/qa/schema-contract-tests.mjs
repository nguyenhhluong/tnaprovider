import { execSync } from "child_process";
import { unlinkSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "../..");
let pass = 0, fail = 0;

function chk(label, condition) {
  if (condition) pass++;
  else { fail++; console.error(`FAIL ${label}`); }
}

function exec(dbPath, content) {
  try {
    execSync(`node --input-type=module`, { cwd: ROOT, input: content, env: { ...process.env, DATABASE_URL: dbPath, APP_ENV: "test", SESSION_SECRET: "test" }, stdio: "pipe", timeout: 30000 });
    return true;
  } catch { return false; }
}

function out(dbPath, content) {
  try {
    return execSync(`node --input-type=module`, { cwd: ROOT, input: content, env: { ...process.env, DATABASE_URL: dbPath, APP_ENV: "test", SESSION_SECRET: "test" }, stdio: "pipe", timeout: 15000 }).toString().trim();
  } catch { return ""; }
}

console.log("=== Schema Contract Tests ===");

const db = "/tmp/tna-contract-test.db";
try { unlinkSync(db); } catch {} try { unlinkSync(db+"-wal"); } catch {}

// 1. Fresh migration passes
chk("fresh migrate", exec(db, `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`));

// 2. Verify versions
const versions = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  const v=db.prepare("SELECT version,name FROM schema_migrations ORDER BY version").all();
  console.log(JSON.stringify(v));db.close();`);
const data = JSON.parse(versions);
chk("8 versions", data.length === 8);
chk("001 present", data.some(v => v.version === "001"));
chk("008 present", data.some(v => v.version === "008"));

// 3. FK check
const fk = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  console.log(db.prepare("PRAGMA foreign_key_check").all().length);db.close();`);
chk("FK clean", parseInt(fk) === 0);

// 4. Integrity
const integ = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  console.log(db.prepare("PRAGMA integrity_check").get()["integrity_check"]);db.close();`);
chk("integrity ok", integ === "ok");

// 5. Contract passes
const contract = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";
  import{verifySchemaContract}from"${ROOT}/server/db/schema-contract.js";const db=new Db("${db}");
  const e=verifySchemaContract(db);console.log(JSON.stringify({errors:e.length}));db.close();`);
const cd = JSON.parse(contract);
chk("contract passes", cd.errors === 0);

// 6. Second run no-op
chk("second run", exec(db, `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`));

// 7. Schema contract file structure
const src = readFileSync(`${ROOT}/server/db/schema-contract.js`, "utf-8");
chk("EXPECTED_MIGRATIONS", src.includes("EXPECTED_MIGRATIONS"));
chk("verifySchemaContract", src.includes("verifySchemaContract"));
chk("FKS array", src.includes("export const FKS"));
chk("INDEXES array", src.includes("export const INDEXES"));
chk("TABLES", src.includes("const TABLES"));
chk("PRAGMA table_info", src.includes("PRAGMA table_info"));
chk("PRAGMA index_info", src.includes("PRAGMA index_info"));
chk("unique validation", src.includes("unique"));

// 8. Runner structure
const runner = readFileSync(`${ROOT}/server/db/versioned-migrate.js`, "utf-8");
chk("FK check in runner", runner.includes("foreign_key_check") && runner.includes("throw"));
chk("missing dir fatal", runner.includes("throw new Error"));

try { unlinkSync(db); } catch {} try { unlinkSync(db+"-wal"); } catch {}

console.log(`\nSchema Contract Tests: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
