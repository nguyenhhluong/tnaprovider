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

export async function withServer({ dbPath, setupEnv }, fn) {
  const finalDb = resolve(ROOT, dbPath || "data/test-phase7h-harness.db");

  // Delete old DB before setup
  if (existsSync(finalDb)) unlinkSync(finalDb);

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

  // Run setup (migrate + seed) as child process to avoid module cache issues
  const setupCode = setupEnv
    ? `import {migrate} from "./server/db/migrate.js"; import {seed} from "./server/db/seed.js"; migrate(); seed();`
    : `import {migrate} from "./server/db/migrate.js"; migrate();`;
  const childEnv = { ...baseEnv, ...(setupEnv || {}) };
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
