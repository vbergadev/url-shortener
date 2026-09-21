import { describe, expect, it } from 'vitest';
import { openDatabase } from './index.js';

describe('openDatabase', () => {
  it('abre a conexão e já cria o schema (links e clicks) em um único passo', () => {
    const db = openDatabase(':memory:');

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];

    expect(tables.map((table) => table.name)).toEqual(['clicks', 'links']);

    db.close();
  });
});
