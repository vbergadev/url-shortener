import { randomUUID } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDbConnection, resolveDatabasePath } from './connection.js';

describe('resolveDatabasePath', () => {
  it('mantém :memory: inalterado', () => {
    expect(resolveDatabasePath(':memory:')).toBe(':memory:');
  });

  it('remove o prefixo file: de uma DATABASE_URL', () => {
    expect(resolveDatabasePath('file:./data/db.sqlite')).toBe('./data/db.sqlite');
  });

  it('mantém um path sem prefixo file: inalterado', () => {
    expect(resolveDatabasePath('./data/db.sqlite')).toBe('./data/db.sqlite');
  });
});

describe('createDbConnection', () => {
  // Diretório isolado por execução, fora do repositório — evita estado
  // compartilhado entre testes (CLAUDE.md — testes não-flaky).
  const testDir = join(tmpdir(), `url-shortener-test-${randomUUID()}`);
  const testFile = join(testDir, 'test.sqlite');

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('cria o diretório e o arquivo do banco quando ainda não existem', () => {
    expect(existsSync(testFile)).toBe(false);

    const db = createDbConnection(`file:${testFile}`);
    db.close();

    expect(existsSync(testFile)).toBe(true);
  });

  it('abre uma conexão :memory: funcional sem tocar o disco', () => {
    const db = createDbConnection(':memory:');

    const result = db.prepare('SELECT 1 as value').get() as { value: number };

    expect(result.value).toBe(1);
    expect(existsSync(testFile)).toBe(false);

    db.close();
  });
});
