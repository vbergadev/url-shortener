import { randomBytes as nodeRandomBytes } from 'node:crypto';

export const SHORT_CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const SHORT_CODE_LENGTH = 7;

export type RandomBytesFn = (size: number) => Buffer;

function pickChar(byte: number): string {
  const index = byte % SHORT_CODE_ALPHABET.length;
  const char = SHORT_CODE_ALPHABET[index];
  if (char === undefined) {
    throw new Error(`Índice de alfabeto fora do intervalo: ${index}.`);
  }
  return char;
}

/**
 * Gera um short code alfanumérico de `length` caracteres.
 *
 * Puro e testável por injeção: `randomBytesFn` é a única fonte de
 * aleatoriedade, controlável em teste (CLAUDE.md — aleatoriedade deve ser
 * injetada para não-flakiness).
 *
 * Esqueleto para o scaffold: a checagem de colisão contra o banco e o retry
 * (ADR-002) ficam para a tarefa de implementação dos endpoints de negócio.
 */
export function generateShortCode(
  length: number = SHORT_CODE_LENGTH,
  randomBytesFn: RandomBytesFn = nodeRandomBytes,
): string {
  const bytes = randomBytesFn(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i];
    if (byte === undefined) {
      throw new Error(`randomBytesFn retornou menos de ${length} bytes.`);
    }
    code += pickChar(byte);
  }
  return code;
}
