---
status: pending
title: "Fundação: tipos, erros, clock, validação e geração de código"
type: backend
complexity: low
---

# Task 1: Fundação: tipos, erros, clock, validação e geração de código

## Overview

Implementa as peças do TechSpec sem nenhuma dependência de camada superior: tipos de
domínio compartilhados (`Link`, `Click`, `LinkStats`), a hierarquia de erros tipados,
a abstração de tempo (`Clock`), a validação de URL, o parsing de `expiresAt` e a
reconciliação do gerador de short code já existente no scaffold com a interface
`CodeGenerator` esperada pelo TechSpec. É a base que toda a lógica de negócio das
tasks 3 e 4 importa — nada aqui toca Fastify nem SQL.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every test case assigned in ## Tests
</critical>

<requirements>
- MUST define `Link`, `Click`, `LinkStats` interfaces in `src/domain/types.ts` exactly as specified in `_techspec.md` Core Interfaces.
- MUST implement `AppError` abstract base class and its 5 concrete subclasses (`InvalidUrlError`, `InvalidExpiresAtError`, `LinkNotFoundError`, `LinkExpiredError`, `CodeGenerationExhaustedError`) in `src/errors/app-errors.ts`, each exposing `code` and `statusCode` exactly as specified.
- MUST implement a `Clock` interface in `src/lib/clock.ts` with a `systemClock` (real time) and a `fixedClock(date)` factory for deterministic tests.
- MUST implement `validateUrl(url: string): string` in `src/lib/url-validator.ts`, throwing `InvalidUrlError` for anything but `http://`/`https://` (case-insensitive protocol), returning the input unchanged (byte-for-byte, query string and fragment included) when valid.
- MUST implement `parseExpiresAt(value: string | undefined): Date | null` in `src/lib/expires-at-parser.ts`, returning `null` for `undefined`, throwing `InvalidExpiresAtError` for unparseable strings, and normalizing any timezone to UTC.
- MUST NOT duplicate the already-scaffolded `src/lib/shortCode.ts` — wrap it behind a `CodeGenerator` interface (`generate(): string`) via a `randomCodeGenerator()` factory in `src/lib/code-generator.ts`, so the existing `shortCode.test.ts` keeps passing unchanged.
- MUST NOT introduce `any` or an unjustified `@ts-ignore`/`@ts-expect-error` (CLAUDE.md code smell #17).
</requirements>

## Subtasks

- [ ] 1.1 Criar `src/domain/types.ts` com `Link`, `Click`, `LinkStats`.
- [ ] 1.2 Criar `src/errors/app-errors.ts` com `AppError` base + as 5 subclasses.
- [ ] 1.3 Criar `src/lib/clock.ts` com `Clock`, `systemClock`, `fixedClock`.
- [ ] 1.4 Criar `src/lib/url-validator.ts` com `validateUrl`.
- [ ] 1.5 Criar `src/lib/expires-at-parser.ts` com `parseExpiresAt`.
- [ ] 1.6 Criar `src/lib/code-generator.ts`: interface `CodeGenerator` + `randomCodeGenerator()` envolvendo `generateShortCode()` de `shortCode.ts`.
- [ ] 1.7 Escrever os 15 testes unitários atribuídos (ver `## Tests`).
- [ ] 1.8 Rodar Definition of Done (`npm test`, `npm run lint`, `npm run build`) e confirmar saída real.

## Implementation Details

Ver `_techspec.md`, seção "Core Interfaces" (assinaturas exatas de `Clock`,
`CodeGenerator`, `Link`, `Click`, `LinkStats`) e "Implementation Design" para os
5 tipos de `AppError`. Nenhum destes arquivos importa Fastify nem `better-sqlite3`.

### Relevant Files

- `.compozy/tasks/url-shortener/_techspec.md` — Core Interfaces (linhas ~64-128): assinaturas exatas a implementar.
- `.compozy/tasks/url-shortener/_tests.md` — definições completas de UT-001 a UT-014 e UT-033.
- `src/lib/shortCode.ts` — já implementa a geração aleatória pura e testada; envolver, não duplicar.
- `src/lib/shortCode.test.ts` — deve continuar passando sem alteração.

### Dependent Files

- `src/services/shorten-service.ts` (task_03) — importa `errors/app-errors.ts`, `lib/url-validator.ts`, `lib/expires-at-parser.ts`, `lib/code-generator.ts`.
- `src/services/redirect-service.ts` (task_03) — importa `lib/clock.ts`, `errors/app-errors.ts`.
- `src/services/stats-service.ts`, `src/views/analytics-page.ts` (task_04) — importam `domain/types.ts` (`LinkStats`), `errors/app-errors.ts`.
- `src/routes/*.ts` (task_05) — o error handler global mapeia cada `AppError` definido aqui.

### Related ADRs

- [ADR-002: Geração de short code](adrs/adr-002.md) — a interface `CodeGenerator` precisa suportar o retry que a task_03 implementa por cima dela.
- [ADR-003: Arquitetura em camadas com dependências injetáveis](adrs/adr-003.md) — racional do `Clock`/`CodeGenerator` injetáveis.

## Deliverables

- `src/domain/types.ts`, `src/errors/app-errors.ts`, `src/lib/clock.ts`, `src/lib/url-validator.ts`, `src/lib/expires-at-parser.ts`, `src/lib/code-generator.ts` criados.
- `src/lib/shortCode.ts` e seus testes existentes intactos.
- Every test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-001 — `lib/clock.ts`: `fixedClock` retorna sempre o mesmo instante.
- [ ] UT-002, UT-003 — `lib/code-generator.ts`: alfabeto e comprimento do código gerado.
- [ ] UT-004, UT-005, UT-006, UT-007, UT-008, UT-009, UT-010 — `lib/url-validator.ts`: protocolo válido/case-insensitive, protocolo inválido, string não-URL, vazia, sem protocolo, query+fragmento preservados.
- [ ] UT-011, UT-012, UT-013, UT-014 — `lib/expires-at-parser.ts`: ausente→null, parse válido, normalização de timezone, formato inválido.
- [ ] UT-033 — `errors/app-errors.ts`: cada uma das 5 classes expõe `code`/`statusCode` corretos.

## Success Criteria

- Every assigned test case implemented and passing
- `npm run lint` e `npm run build` limpos, sem `any`/`@ts-ignore` não justificado
- `shortCode.test.ts` (já existente) continua passando sem modificação
