import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { openDatabase } from './db/index.js';

const HOST = '0.0.0.0';

/**
 * Entry point real do processo: carrega config, abre o banco, monta o app e
 * sobe o listener na PORT configurada. É isso que `npm run dev`/`start` roda.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase(config.databaseUrl);
  const app = buildApp({ logger: true });

  app.addHook('onClose', () => {
    db.close();
  });

  try {
    await app.listen({ port: config.port, host: HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
