export interface AppConfig {
  port: number;
  host: string;
  databaseUrl: string;
  dataDir: string;
  maxJsonBytes: number;
  webDistDir: string;
}

/** Read config from the environment with conservative local defaults. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    // Default to localhost; the PRD requires a conservative local default (§15.3).
    host: env.HOST ?? '127.0.0.1',
    databaseUrl: env.DATABASE_URL ?? 'file:./data/luma.db',
    dataDir: env.DATA_DIR ?? './data',
    maxJsonBytes: Number(env.MAX_JSON_BYTES ?? 1_000_000),
    webDistDir: env.WEB_DIST_DIR ?? './web',
  };
}
