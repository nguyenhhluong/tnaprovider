import { spawn, execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

export async function ensurePortFree(port = 3007) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", (err) => { reject(new Error(`Port ${port} in use: ${err.message}`)); });
    server.once("listening", () => { server.close(); resolvePort(); });
    server.listen(port, "127.0.0.1");
  });
}

export async function withServer({ dbPath, setupEnv, setupUsers }, fn) {
  const finalDb = resolve(ROOT, dbPath || "data/test-phase7h-harness.db");

  // Delete old DB + WAL/SHM before setup
  if (existsSync(finalDb)) unlinkSync(finalDb);
  try { if (existsSync(finalDb + "-wal")) unlinkSync(finalDb + "-wal"); } catch {}
  try { if (existsSync(finalDb + "-shm")) unlinkSync(finalDb + "-shm"); } catch {}

  // Check port
  try { await ensurePortFree(3007); }
  catch (e) { throw new Error(`Port 3007 is in use. Cannot start test server.`); }

  const baseEnv = {
    ...process.env,
    DATABASE_URL: finalDb,
    APP_ENV: "test",
    SESSION_SECRET: "phase7h-harness-secret",
    MAIL_PROVIDER: "mock",
    VITE_EMAIL_MOCK_MODE: "true",
    HOST: "127.0.0.1",
    PORT: "3007",
  };

  // Build setup code: migrate, optionally seed, then create extra users
  let setupCode = `import {migrate} from "./server/db/migrate.js"; await migrate();`;
  if (setupEnv) {
    setupCode = `import {migrate} from "./server/db/migrate.js"; import {seed} from "./server/db/seed.js"; await migrate(); seed();`;
  }
  const childEnv = { ...baseEnv, ...(setupEnv || {}) };
  if (setupUsers && setupUsers.length > 0) {
    const usersB64 = Buffer.from(JSON.stringify(setupUsers.map(u => ({
      email: u.email,
      password: u.password,
      name: u.name,
      role: u.role,
      mustChangePassword: u.mustChangePassword || false,
      hourlyRate: u.hourlyRate || 38.5,
    })))).toString("base64");
    childEnv.SETUP_USERS_B64 = usersB64;
    setupCode += `
import {getDb, closeDb} from "./server/db/database.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
const _raw = JSON.parse(Buffer.from("${usersB64}", "base64").toString());
const _db = getDb();
const _now = new Date().toISOString();
for (const _u of _raw) {
  _db.prepare("DELETE FROM users WHERE email = ?").run(_u.email);
  const _hash = bcrypt.hashSync(_u.password, 12);
  _db.prepare("INSERT INTO users (id, email, name, role, password_hash, status, must_change_password, hourly_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)").run(crypto.randomUUID(), _u.email, _u.name, _u.role, _hash, _u.mustChangePassword ? 1 : 0, _u.hourlyRate, _now, _now);
}
closeDb();`;
  }
  const proc = spawn("node", ["--input-type=module"], { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"], env: childEnv });
  proc.stdin.write(setupCode);
  proc.stdin.end();
  const setupOut = await new Promise((resolve, reject) => {
    let out = "", err = "";
    proc.stdout.on("data", (d) => out += d);
    proc.stderr.on("data", (d) => {});
    proc.on("close", (code) => { if (code !== 0) reject(new Error(`Setup exited ${code}: ${err || out}`)); else resolve(out); });
    proc.on("error", reject);
  });


  const server = spawn("node", ["server.js"], { cwd: ROOT, stdio: "pipe", env: baseEnv });
  let started = false;
  try {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch("http://127.0.0.1:3007/");
        if (res.ok || res.status === 301 || res.status === 302) { started = true; break; }
      } catch {}
    }
    if (!started) throw new Error("Server did not start within 30s");
    await fn();
  } finally {
    server.kill("SIGTERM");
    // Wait for port to be released
    for (let i = 0; i < 10; i++) {
      try { await ensurePortFree(3007); break; } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    if (existsSync(finalDb)) {
      try { unlinkSync(finalDb); } catch {}
      try { if (existsSync(finalDb + "-wal")) unlinkSync(finalDb + "-wal"); } catch {}
      try { if (existsSync(finalDb + "-shm")) unlinkSync(finalDb + "-shm"); } catch {}
    }
  }
}

export async function getCookie(email, password, base = "http://127.0.0.1:3007") {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const setCookie = res.headers.get("set-cookie") || "";
  return setCookie.split(";")[0];
}

export function auth(cookie) {
  return cookie ? { headers: { Cookie: cookie } } : {};
}

export async function mustGetCookie(email, password, label) {
  const c = await getCookie(email, password);
  if (!c) { console.error(`FATAL: ${label} login failed`); process.exit(1); }
  return c;
}
