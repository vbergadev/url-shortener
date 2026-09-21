import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('buildApp', () => {
  it('responde 200 com { status: "ok" } em GET /health', async () => {
    const app = buildApp();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });

    await app.close();
  });

  it('devolve 404 para uma rota de negócio ainda não implementada neste scaffold', async () => {
    const app = buildApp();

    const response = await app.inject({ method: 'POST', url: '/api/shorten' });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});
