import { describe, expect, it } from 'vitest';
import { InvalidConfigError, loadConfig } from './env.js';

describe('loadConfig', () => {
  it('usa valores default quando nenhuma env var é definida', () => {
    const config = loadConfig({});

    expect(config).toEqual({
      port: 3000,
      baseUrl: 'http://localhost:3000',
      databaseUrl: 'file:./data/url-shortener.sqlite',
    });
  });

  it('usa os valores fornecidos quando presentes', () => {
    const config = loadConfig({
      PORT: '4321',
      BASE_URL: 'https://short.example.com',
      DATABASE_URL: ':memory:',
    });

    expect(config).toEqual({
      port: 4321,
      baseUrl: 'https://short.example.com',
      databaseUrl: ':memory:',
    });
  });

  it('rejeita PORT não numérica', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(InvalidConfigError);
  });

  it('rejeita PORT fora do intervalo válido (0 e > 65535)', () => {
    expect(() => loadConfig({ PORT: '0' })).toThrow(InvalidConfigError);
    expect(() => loadConfig({ PORT: '70000' })).toThrow(InvalidConfigError);
  });

  it('rejeita BASE_URL malformada', () => {
    expect(() => loadConfig({ BASE_URL: 'não-é-uma-url' })).toThrow(InvalidConfigError);
  });

  it('trata string em branco como ausente e usa o default', () => {
    const config = loadConfig({ PORT: '  ', BASE_URL: '' });

    expect(config.port).toBe(3000);
    expect(config.baseUrl).toBe('http://localhost:3000');
  });
});
