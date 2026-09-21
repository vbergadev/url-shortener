import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    // Isolamento por teste (CLAUDE.md — sem estado compartilhado entre testes):
    // cada arquivo de teste roda em um contexto próprio.
    isolate: true,
  },
});
