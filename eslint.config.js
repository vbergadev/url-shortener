// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'data/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Code smell #17 (CLAUDE.md): `any` explícito é proibido.
      '@typescript-eslint/no-explicit-any': 'error',
      // Code smell #17: @ts-ignore/@ts-expect-error só com justificativa escrita.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': { descriptionFormat: '^: .{10,}$' },
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
      // Code smell #20: variável não usada é sinal de código morto/erro.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Code smell #20: promise sem await / erro assíncrono não tratado.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Code smell #17: cast forçado sem justificativa.
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      // Testes podem usar non-null assertion em fixtures controladas pelo próprio teste.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
