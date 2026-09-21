/**
 * Ponto único de leitura e validação de variáveis de ambiente (CLAUDE.md §4).
 * Nenhum outro módulo deve ler `process.env` diretamente.
 */

const DEFAULT_PORT = 3000;
const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_DATABASE_URL = 'file:./data/url-shortener.sqlite';

const MIN_PORT = 1;
const MAX_PORT = 65535;

export interface AppConfig {
  readonly port: number;
  readonly baseUrl: string;
  readonly databaseUrl: string;
}

export class InvalidConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConfigError';
  }
}

function isBlank(value: string | undefined): value is undefined {
  return value === undefined || value.trim() === '';
}

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function parsePort(rawPort: string | undefined): number {
  if (isBlank(rawPort)) {
    return DEFAULT_PORT;
  }
  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed < MIN_PORT || parsed > MAX_PORT) {
    throw new InvalidConfigError(
      `PORT inválido: "${rawPort}". Esperado um inteiro entre ${MIN_PORT} e ${MAX_PORT}.`,
    );
  }
  return parsed;
}

function parseBaseUrl(rawBaseUrl: string | undefined): string {
  const value = isBlank(rawBaseUrl) ? DEFAULT_BASE_URL : rawBaseUrl;
  if (!isAbsoluteUrl(value)) {
    throw new InvalidConfigError(`BASE_URL inválida: "${value}". Esperado uma URL absoluta.`);
  }
  return value;
}

function parseDatabaseUrl(rawDatabaseUrl: string | undefined): string {
  return isBlank(rawDatabaseUrl) ? DEFAULT_DATABASE_URL : rawDatabaseUrl;
}

/**
 * Carrega e valida a configuração da aplicação a partir de variáveis de ambiente.
 * Lança `InvalidConfigError` se algum valor fornecido for inválido — nunca segue
 * com um valor hostil (code smell #18, CLAUDE.md).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: parsePort(env.PORT),
    baseUrl: parseBaseUrl(env.BASE_URL),
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL),
  };
}
