import Fastify, { type FastifyInstance } from 'fastify';

export interface BuildAppOptions {
  readonly logger?: boolean;
}

/**
 * Monta e retorna a instância do Fastify, sem chamar `.listen()`. Isso é o
 * que permite testar via `app.inject()` sem subir uma porta real
 * (CLAUDE.md — testes determinísticos, sem porta fixa).
 *
 * Este scaffold só expõe `GET /health` como smoke check. Os endpoints de
 * negócio (`POST /api/shorten`, `GET /:code`, `GET /api/urls`,
 * `GET /api/stats/:code`, `GET /analytics/:code`) ficam para a próxima
 * tarefa, depois que o TechSpec fechar os detalhes de arquitetura.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  app.get('/health', () => ({ status: 'ok' as const }));

  return app;
}
