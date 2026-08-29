import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/*.tsbuildinfo', 'data/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Domain layer must not import framework/persistence code.
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*'], message: 'Domain must not import React.' },
            { group: ['hono', 'hono/*'], message: 'Domain must not import Hono.' },
            { group: ['drizzle-orm', 'drizzle-orm/*'], message: 'Domain must not import Drizzle.' },
            { group: ['better-sqlite3'], message: 'Domain must not import SQLite drivers.' },
          ],
        },
      ],
    },
  },
);
