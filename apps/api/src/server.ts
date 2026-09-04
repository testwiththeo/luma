import { serve } from '@hono/node-server';
import { createDatabase, runMigrations } from '@luma/database';
import { loadConfig } from './config.js';
import { createApp } from './app.js';

function log(level: string, message: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, timestamp: new Date().toISOString(), message, ...extra }));
}

function main(): void {
  const config = loadConfig();

  // Apply migrations before accepting traffic; fail startup if they fail (§9.4).
  try {
    runMigrations(config.databaseUrl);
    log('info', 'migrations applied', { databaseUrl: config.databaseUrl });
  } catch (err) {
    log('error', 'migration failed; refusing to start', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  const db = createDatabase(config.databaseUrl);
  const { app } = createApp({ db, staticRoot: config.webDistDir });

  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    log('info', 'luma api listening', { host: config.host, port: info.port });
  });

  // Graceful shutdown: stop accepting traffic, then close the database (§12).
  const shutdown = (signal: string): void => {
    log('info', 'shutting down', { signal });
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
