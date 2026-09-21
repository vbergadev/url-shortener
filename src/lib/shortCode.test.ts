import { describe, expect, it } from 'vitest';
import { generateShortCode, SHORT_CODE_ALPHABET, SHORT_CODE_LENGTH } from './shortCode.js';

describe('generateShortCode', () => {
  it('gera um código determinístico a partir dos bytes injetados', () => {
    const bytes = Buffer.from([0, 1, 2, 3, 4, 5, 6]);

    const code = generateShortCode(SHORT_CODE_LENGTH, () => bytes);

    const expected = Array.from(bytes)
      .map((byte) => SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length])
      .join('');
    expect(code).toBe(expected);
  });

  it('gera um código com o comprimento solicitado', () => {
    const code = generateShortCode(10, () => Buffer.from(new Array(10).fill(42)));

    expect(code).toHaveLength(10);
  });

  it('usa o comprimento e o alfabeto default quando nenhum argumento é passado', () => {
    const code = generateShortCode();

    expect(code).toMatch(/^[A-Za-z0-9]{7}$/);
  });

  it('lança erro se a fonte de aleatoriedade retornar menos bytes que o pedido', () => {
    expect(() => generateShortCode(7, () => Buffer.from([1, 2, 3]))).toThrow(/menos de 7 bytes/);
  });
});
