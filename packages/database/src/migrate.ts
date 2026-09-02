import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createDatabase } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Apply all pending migrations. Fails loudly if a migration cannot be applied;
 * the application must refuse to start on migration failure (§9.4, US-027).
 */
export function runMigrations(databaseUrl: string): void {
  const handle = createDatabase(databaseUrl);
  try {
    const migrationsFolder = resolve(__dirname, '../migrations');
    migrate(handle.db, { migrationsFolder });
  } finally {
    handle.close();
  }
}

// Allow running directly: `tsx src/migrate.ts`
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const url = process.env.DATABASE_URL ?? 'file:./data/luma.db';
  runMigrations(url);
  console.log(`Migrations applied to ${url}`);
}
