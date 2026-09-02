import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, checkDatabase } from './client.js';
import { runMigrations } from './migrate.js';

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('migrations + persistence', () => {
  it('applies migrations and creates the expected tables', () => {
    dir = mkdtempSync(join(tmpdir(), 'luma-db-'));
    const url = `file:${join(dir, 'luma.db')}`;

    runMigrations(url);

    const handle = createDatabase(url);
    try {
      const tables = handle.sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain('boards');
      expect(names).toContain('columns');
      expect(names).toContain('tasks');
      expect(checkDatabase(handle)).toBe(true);
    } finally {
      handle.close();
    }
  });

  it('enables WAL journal mode and foreign keys', () => {
    dir = mkdtempSync(join(tmpdir(), 'luma-db-'));
    const url = `file:${join(dir, 'luma.db')}`;
    const handle = createDatabase(url);
    try {
      expect(String(handle.sqlite.pragma('journal_mode', { simple: true })).toLowerCase()).toBe(
        'wal',
      );
      expect(handle.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    } finally {
      handle.close();
    }
  });

  it('enforces core value constraints in SQLite', () => {
    dir = mkdtempSync(join(tmpdir(), 'luma-db-'));
    const url = `file:${join(dir, 'luma.db')}`;
    runMigrations(url);

    const handle = createDatabase(url);
    try {
      const now = Date.now();
      handle.sqlite
        .prepare(
          'INSERT INTO boards (id, title, version, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
        )
        .run('b1', 'QA Work', now, now);
      handle.sqlite
        .prepare(
          "INSERT INTO columns (id, board_id, status_type, name, position, wip_limit, version, created_at, updated_at) VALUES (?, ?, 'inbox', ?, 0, ?, 1, ?, ?)",
        )
        .run('c1', 'b1', 'Inbox', null, now, now);

      expect(() =>
        handle.sqlite
          .prepare(
            "INSERT INTO columns (id, board_id, status_type, name, position, wip_limit, version, created_at, updated_at) VALUES ('c-negative-wip', 'b1', 'ready', 'Ready', 1, -1, 1, ?, ?)",
          )
          .run(now, now),
      ).toThrow(/CHECK constraint failed/);
      expect(() =>
        handle.sqlite
          .prepare(
            "INSERT INTO columns (id, board_id, status_type, name, position, wip_limit, version, created_at, updated_at) VALUES ('c-invalid-status', 'b1', 'unknown', 'Unknown', 1, NULL, 1, ?, ?)",
          )
          .run(now, now),
      ).toThrow(/CHECK constraint failed/);
      expect(() =>
        handle.sqlite
          .prepare(
            "INSERT INTO tasks (id, board_id, column_id, title, priority, task_type, position, version, created_at, updated_at) VALUES ('t-invalid-priority', 'b1', 'c1', 'Invalid priority', 'critical', 'general', 0, 1, ?, ?)",
          )
          .run(now, now),
      ).toThrow(/CHECK constraint failed/);
      expect(() =>
        handle.sqlite
          .prepare(
            "INSERT INTO tasks (id, board_id, column_id, title, priority, task_type, position, version, created_at, updated_at) VALUES ('t-invalid-type', 'b1', 'c1', 'Invalid type', 'medium', 'unknown', 1, 1, ?, ?)",
          )
          .run(now, now),
      ).toThrow(/CHECK constraint failed/);
      expect(() =>
        handle.sqlite
          .prepare(
            "INSERT INTO tasks (id, board_id, column_id, title, priority, task_type, position, version, created_at, updated_at) VALUES ('t-negative-position', 'b1', 'c1', 'Invalid position', 'medium', 'general', -1, 1, ?, ?)",
          )
          .run(now, now),
      ).toThrow(/CHECK constraint failed/);
    } finally {
      handle.close();
    }
  });

  it('enforces foreign keys and cascades owned rows', () => {
    dir = mkdtempSync(join(tmpdir(), 'luma-db-'));
    const url = `file:${join(dir, 'luma.db')}`;
    runMigrations(url);

    const handle = createDatabase(url);
    try {
      const now = Date.now();
      expect(() =>
        handle.sqlite
          .prepare(
            "INSERT INTO columns (id, board_id, status_type, name, position, wip_limit, version, created_at, updated_at) VALUES ('orphan-column', 'missing-board', 'inbox', 'Inbox', 0, NULL, 1, ?, ?)",
          )
          .run(now, now),
      ).toThrow(/FOREIGN KEY constraint failed/);

      handle.sqlite
        .prepare(
          'INSERT INTO boards (id, title, version, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
        )
        .run('b-cascade', 'Cascade test', now, now);
      handle.sqlite
        .prepare(
          "INSERT INTO columns (id, board_id, status_type, name, position, wip_limit, version, created_at, updated_at) VALUES ('c-cascade', 'b-cascade', 'inbox', 'Inbox', 0, NULL, 1, ?, ?)",
        )
        .run(now, now);
      handle.sqlite
        .prepare(
          "INSERT INTO tasks (id, board_id, column_id, title, priority, task_type, position, version, created_at, updated_at) VALUES ('t-cascade', 'b-cascade', 'c-cascade', 'Cascade task', 'medium', 'general', 0, 1, ?, ?)",
        )
        .run(now, now);
      handle.sqlite.prepare('DELETE FROM boards WHERE id = ?').run('b-cascade');
      expect(
        handle.sqlite.prepare('SELECT 1 FROM columns WHERE id = ?').get('c-cascade'),
      ).toBeUndefined();
      expect(
        handle.sqlite.prepare('SELECT 1 FROM tasks WHERE id = ?').get('t-cascade'),
      ).toBeUndefined();
    } finally {
      handle.close();
    }
  });

  it('persists rows across a reconnect (survives restart)', () => {
    dir = mkdtempSync(join(tmpdir(), 'luma-db-'));
    const url = `file:${join(dir, 'luma.db')}`;
    runMigrations(url);

    const first = createDatabase(url);
    const now = Date.now();
    first.sqlite
      .prepare(
        'INSERT INTO boards (id, title, version, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
      )
      .run('b1', 'QA Work', now, now);
    first.close();

    const second = createDatabase(url);
    try {
      const row = second.sqlite.prepare('SELECT title FROM boards WHERE id = ?').get('b1') as
        { title: string } | undefined;
      expect(row?.title).toBe('QA Work');
    } finally {
      second.close();
    }
  });
});
