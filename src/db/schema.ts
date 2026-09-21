import type Database from 'better-sqlite3';

const CREATE_LINKS_TABLE = `
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT NOT NULL,
    original_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT
  )
`;

const CREATE_LINKS_SHORT_CODE_INDEX = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code)
`;

const CREATE_CLICKS_TABLE = `
  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (link_id) REFERENCES links (id)
  )
`;

const CREATE_CLICKS_LINK_ID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks (link_id)
`;

/**
 * Cria (ou confirma existente) o schema do banco. Idempotente por construção —
 * todo `CREATE` usa `IF NOT EXISTS`, então pode ser chamado a cada boot sem
 * efeito colateral em cima de um banco já migrado.
 */
export function createSchema(db: Database.Database): void {
  db.exec(CREATE_LINKS_TABLE);
  db.exec(CREATE_LINKS_SHORT_CODE_INDEX);
  db.exec(CREATE_CLICKS_TABLE);
  db.exec(CREATE_CLICKS_LINK_ID_INDEX);
}
