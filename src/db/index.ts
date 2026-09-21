import type Database from 'better-sqlite3';
import { createDbConnection } from './connection.js';
import { createSchema } from './schema.js';

export { createDbConnection, resolveDatabasePath } from './connection.js';
export { createSchema } from './schema.js';

/**
 * Abre a conexão e garante o schema em um único passo — usado tanto pelo
 * `server.ts` (banco em arquivo) quanto pelos testes (`:memory:`).
 */
export function openDatabase(databaseUrl: string): Database.Database {
  const db = createDbConnection(databaseUrl);
  createSchema(db);
  return db;
}
