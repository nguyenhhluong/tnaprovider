import { migrate } from './db/migrate.js';

export async function runStartupChecks() {
  // Perform any pre-startup validation
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
