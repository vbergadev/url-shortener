import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSchema } from './schema.js';

interface SqliteMasterRow {
  name: string;
}

interface LinkRow {
  id: number;
  short_code: string;
  original_url: string;
  expires_at: string | null;
}

interface ClickRow {
  id: number;
  link_id: number;
  ip: string;
}

describe('createSchema', () => {
  // Cada teste abre sua própria conexão :memory: — sem estado compartilhado
  // entre testes (CLAUDE.md — testes não-flaky).
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('cria as tabelas links e clicks', () => {
    createSchema(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as SqliteMasterRow[];

    expect(tables.map((table) => table.name)).toEqual(['clicks', 'links']);
  });

  it('impede dois links com o mesmo short_code (índice único)', () => {
    createSchema(db);
    const insertLink = db.prepare(
      'INSERT INTO links (short_code, original_url, created_at) VALUES (?, ?, ?)',
    );

    insertLink.run('abc1234', 'https://example.com', '2026-09-21T00:00:00.000Z');

    expect(() =>
      insertLink.run('abc1234', 'https://other.com', '2026-09-21T00:00:00.000Z'),
    ).toThrow();
  });

  it('permite inserir e ler um link com expires_at nulo', () => {
    createSchema(db);

    db.prepare(
      'INSERT INTO links (short_code, original_url, created_at) VALUES (?, ?, ?)',
    ).run('abc1234', 'https://example.com', '2026-09-21T00:00:00.000Z');

    const link = db
      .prepare('SELECT * FROM links WHERE short_code = ?')
      .get('abc1234') as LinkRow | undefined;

    expect(link).toMatchObject({
      short_code: 'abc1234',
      original_url: 'https://example.com',
      expires_at: null,
    });
  });

  it('permite inserir um clique associado a um link existente', () => {
    createSchema(db);

    const linkResult = db
      .prepare('INSERT INTO links (short_code, original_url, created_at) VALUES (?, ?, ?)')
      .run('xyz9999', 'https://example.com', '2026-09-21T00:00:00.000Z');

    db.prepare(
      'INSERT INTO clicks (link_id, referrer, user_agent, ip, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(linkResult.lastInsertRowid, null, null, '127.0.0.1', '2026-09-21T00:00:01.000Z');

    const clicks = db
      .prepare('SELECT * FROM clicks WHERE link_id = ?')
      .all(linkResult.lastInsertRowid) as ClickRow[];

    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.ip).toBe('127.0.0.1');
  });

  it('é idempotente — pode ser chamada mais de uma vez sem erro', () => {
    createSchema(db);

    expect(() => createSchema(db)).not.toThrow();
  });
});
