import { spawn } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DB_PATH = resolve(ROOT, "data/test-phase7h-harness.db");

export { DB_PATH };

export async function withServer(dbPath, fn) {
  const finalDb = dbPath || DB_PATH;
  if (existsSync(finalDb)) unlinkSync(finalDb);

  const env = {
    ...process.env,
    DATABASE_URL: finalDb,
    APP_ENV: "development",
    SESSION_SECRET: "phase7h-harness-secret",
    MAIL_PROVIDER: "mock",
    VITE_EMAIL_MOCK_MODE: "true",
    HOST: "127.0.0.1",
    PORT: "3007",
  };

  const server = spawn("node", ["server.js"], { cwd: ROOT, stdio: "pipe", env });
  let started = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch("http://127.0.0.1:3007/");
      if (res.ok || res.status === 301 || res.status === 302) { started = true; break; }
    } catch {}
  }
  if (!started) { server.kill(); throw new Error("Server did not start"); }

  try {
    await fn();
  } finally {
    server.kill("SIGTERM");
    await new Promise(r => setTimeout(r, 500));
  }
}

export async function getCookie(email, password, base = "http://127.0.0.1:3007") {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  return setCookie.split(";")[0];
}

export function auth(cookie) {
  return cookie ? { headers: { Cookie: cookie } } : {};
}
