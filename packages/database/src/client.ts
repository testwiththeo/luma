import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/index.js';

export type LumaDatabase = ReturnType<typeof createDatabase>['db'];

export interface DatabaseHandle {
  db: ReturnType<typeof drizzle<typeof schema>>;
  sqlite: Database.Database;
  close: () => void;
}

/**
 * Create a configured SQLite connection (SOFTWARE_ARCHITECTURE §9.4):
 * - Enable foreign keys.
 * - Enable WAL journal mode.
 * - Bounded busy timeout.
 */
export function createDatabase(url: string): DatabaseHandle {
  // Accept `file:/path` URLs or bare paths.
  const filename = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const sqlite = new Database(filename);

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');

  const db = drizzle(sqlite, { schema });

  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  };
}

/** Lightweight readiness probe used by /health. */
export function checkDatabase(handle: DatabaseHandle): boolean {
  try {
    const row = handle.sqlite.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}
