import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

const FILE_URL_PREFIX = 'file:';
const IN_MEMORY_DATABASE = ':memory:';

/**
 * Converte um `DATABASE_URL` (ex.: `file:./data/db.sqlite`) no path de arquivo que
 * `better-sqlite3` espera. `:memory:` passa direto — é o valor usado pelos testes
 * para isolamento sem tocar disco (CLAUDE.md — testes não-flaky).
 */
export function resolveDatabasePath(databaseUrl: string): string {
  if (databaseUrl === IN_MEMORY_DATABASE) {
    return IN_MEMORY_DATABASE;
  }
  return databaseUrl.startsWith(FILE_URL_PREFIX)
    ? databaseUrl.slice(FILE_URL_PREFIX.length)
    : databaseUrl;
}

function ensureDirectoryExists(filePath: string): void {
  const directory = dirname(filePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

/**
 * Abre uma conexão `better-sqlite3`. Aceita um path configurável (arquivo real
 * ou `:memory:`), essencial para que os testes rodem isolados e determinísticos.
 */
export function createDbConnection(databaseUrl: string): Database.Database {
  const path = resolveDatabasePath(databaseUrl);
  const isFileBased = path !== IN_MEMORY_DATABASE;
  if (isFileBased) {
    ensureDirectoryExists(path);
  }

  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  if (isFileBased) {
    db.pragma('journal_mode = WAL');
  }
  return db;
}
