import { migrate } from './db/migrate.js';
import { validateAppBaseUrl } from './config/appUrl.js';

export async function runStartupChecks() {
  const strict = process.env.APP_ENV === 'production';
  const result = validateAppBaseUrl(strict);
  if (!result.valid) {
    console.warn(`[startup] APP_BASE_URL validation: ${result.reason}`);
    if (strict) {
      console.error('[startup] APP_BASE_URL is invalid or missing in production. Email links will be broken.');
    }
  } else {
    console.log(`[startup] APP_BASE_URL: ${result.value}`);
  }
}

export async function startServer(app) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || "127.0.0.1";

  // Run migration before starting listener
  if (process.env.APP_ENV !== 'test') {
    try {
      await migrate();
    } catch (err) {
      console.error('Migration failed:', err.message);
      console.error(err.stack);
      process.exit(1);
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    const DIST_DIR = new URL('../dist', import.meta.url).pathname;
    console.log(`Serving files from ${DIST_DIR}`);
  });

  return server;
}
