import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    // Resolve workspace packages to source so tests run without a prior build.
    alias: {
      '@luma/contracts': r('./packages/contracts/src/index.ts'),
      '@luma/domain': r('./packages/domain/src/index.ts'),
      '@luma/database': r('./packages/database/src/index.ts'),
      '@luma/application': r('./packages/application/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // better-sqlite3 is a native module; don't let vite try to transform it.
    server: { deps: { external: ['better-sqlite3'] } },
  },
});
