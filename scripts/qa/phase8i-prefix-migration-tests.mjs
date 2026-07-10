import { execSync } from "child_process";
import { unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "../..");
let pass = 0, fail = 0;

function chk(label, condition) {
  if (condition) pass++;
  else { fail++; console.error(`FAIL ${label}`); }
}

function exec(dbPath, content) {
  try {
    execSync(`node --input-type=module`, { cwd: ROOT, input: content, env: { ...process.env, DATABASE_URL: dbPath }, stdio: "pipe", timeout: 30000 });
    return true;
  } catch { return false; }
}

function out(dbPath, content) {
  try {
    return execSync(`node --input-type=module`, { cwd: ROOT, input: content, env: { ...process.env, DATABASE_URL: dbPath }, stdio: "pipe", timeout: 15000 }).toString().trim();
  } catch { return ""; }
}

const ALL = ["001","002","003","004","005","006","007","008"];
const NAMES = ["initial-schema","auth-invites","client-portal","realtime-timesheets","pay-rules","platform-modules","contact-requests","professional-quotes"];

console.log("=== Phase 8I: Prefix Migration Tests ===");

const db = "/tmp/tna-prefix.db";
try { unlinkSync(db); } catch {} try { unlinkSync(db+"-wal"); } catch {}

// 1. Fresh full migration
chk("fresh migrate", exec(db, `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`));

const s = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  const v=db.prepare("SELECT version FROM schema_migrations ORDER BY version").all();
  const fk=db.prepare("PRAGMA foreign_key_check").all().length;
  const integ=db.prepare("PRAGMA integrity_check").get()["integrity_check"];
  console.log(v.length+"|"+fk+"|"+integ+"|"+v.map(x=>x.version).join(","));`).split("|");

chk("fresh: 8 versions", s[0] === "8");
chk("fresh: FK clean", s[1] === "0");
chk("fresh: integrity ok", s[2] === "ok");
chk("fresh: all versions", s[3] === ALL.join(","));

// 2. Second run no-op
chk("fresh: second run", exec(db, `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`));

// 3. Strip records {005,006,007,008} then resume
exec(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  db.prepare("DELETE FROM schema_migrations WHERE version IN('005','006','007','008')").run();db.close();`);

const s2 = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  const v=db.prepare("SELECT version FROM schema_migrations ORDER BY version").all();console.log(v.length+"|"+v.map(x=>x.version).join(","));`).split("|");
chk("strip: 4 remaining", s2[0] === "4");
chk("strip: correct", s2[1] === "001,002,003,004");

chk("resume migrate", exec(db, `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`));

const s3 = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  const v=db.prepare("SELECT version FROM schema_migrations ORDER BY version").all();
  const fk=db.prepare("PRAGMA foreign_key_check").all().length;
  const integ=db.prepare("PRAGMA integrity_check").get()["integrity_check"];
  console.log(v.length+"|"+fk+"|"+integ+"|"+v.map(x=>x.version).join(","));`).split("|");
chk("resume: 8 versions", s3[0] === "8");
chk("resume: FK clean", s3[1] === "0");
chk("resume: integrity ok", s3[2] === "ok");
chk("resume: all versions", s3[3] === ALL.join(","));
chk("resume: second run", exec(db, `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`));

// 4. Strip ALL records, re-run
exec(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  db.prepare("DELETE FROM schema_migrations").run();db.close();`);
chk("re-run migrate", exec(db, `import{migrate}from"${ROOT}/server/db/migrate.js";await migrate();`));
const s4 = out(db, `import Db from"${ROOT}/node_modules/better-sqlite3/lib/index.js";const db=new Db("${db}");
  const v=db.prepare("SELECT version FROM schema_migrations ORDER BY version").all();
  const fk=db.prepare("PRAGMA foreign_key_check").all().length;
  console.log(v.length+"|"+fk+"|"+v.map(x=>x.version).join(","));`).split("|");
chk("re-run: 8 versions", s4[0] === "8");
chk("re-run: FK clean", s4[1] === "0");
chk("re-run: all versions", s4[2] === ALL.join(","));

try { unlinkSync(db); } catch {} try { unlinkSync(db+"-wal"); } catch {}

console.log(`\nPhase 8I: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) process.exit(1);
