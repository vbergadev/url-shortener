---
status: pending
title: "Repositórios: links e clicks"
type: backend
complexity: medium
---

# Task 2: Repositórios: links e clicks

## Overview

Implementa a única camada do sistema que fala SQL: `links-repository` e
`clicks-repository`, sobre a conexão `better-sqlite3` e o schema já scaffolded.
Inclui a CTE recursiva de `clicksByDay` (zero-preenchendo 30 dias) e o agrupamento
de `topReferrers`. É onde a correção de query importa de verdade — por isso os 6
testes atribuídos rodam contra SQLite real em `:memory:`, nunca contra um fake.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every test case assigned in ## Tests
</critical>

<requirements>
- MUST NOT let any module outside `src/repositories/*.ts` import `better-sqlite3` directly (CLAUDE.md code smell #6 — isolamento de infraestrutura).
- MUST implement `src/repositories/links-repository.ts` with `insert(link)`, `findByShortCode(code)`, and `listAllWithClickCounts()` — the last one a single query (`LEFT JOIN` + `GROUP BY` against `clicks`) ordered by `created_at` descending, not an N+1 loop.
- MUST implement `src/repositories/clicks-repository.ts` with `insertClick(click)`, `countByLinkId(linkId)`, `getClicksByDay(linkId, today)` using the exact recursive CTE from `_techspec.md`, and `getTopReferrers(linkId)` grouping `NULL` under `'direto'`.
- MUST use `better-sqlite3` named parameters (`.all({ linkId, today })`, `.run({...})`) exclusively — never string concatenation with an external value (CLAUDE.md code smell #21).
- MUST surface a distinguishable, typed signal when `insert()` violates the `short_code` `UNIQUE` constraint (inspect the driver error and rethrow as a repository-level error type), so task_03's retry logic can catch it without inspecting `better-sqlite3` internals directly.
- MUST receive an already-open `Database` instance in each repository's constructor/factory — repositories never open their own connection (that stays in `db/connection.ts`, already scaffolded).
- Each test MUST open its own `:memory:` connection with the schema applied via the existing `openDatabase()`/`createSchema()` helpers — no shared state between tests (CLAUDE.md 1.3).
</requirements>

## Subtasks

- [ ] 2.1 `links-repository.ts`: `insert` + `findByShortCode`.
- [ ] 2.2 `links-repository.ts`: `listAllWithClickCounts` (query única com JOIN).
- [ ] 2.3 Sinal tipado de violação de `UNIQUE` no `insert` de `links-repository`.
- [ ] 2.4 `clicks-repository.ts`: `insertClick` + `countByLinkId`.
- [ ] 2.5 `clicks-repository.ts`: `getClicksByDay` (CTE recursiva de 30 dias).
- [ ] 2.6 `clicks-repository.ts`: `getTopReferrers` (agrupando `null` sob `'direto'`).
- [ ] 2.7 Escrever os 6 testes de integração atribuídos (ver `## Tests`).
- [ ] 2.8 Rodar Definition of Done (`npm test`, `npm run lint`, `npm run build`) e confirmar saída real.

## Implementation Details

Ver `_techspec.md`, seção "Data Models": schema SQL completo, e as 3 queries exatas
(`totalClicks`, `clicksByDay` com `WITH RECURSIVE`, `topReferrers`). Copiar a query
da CTE literalmente do TechSpec — é a parte do sistema com maior risco de erro sutil
(ver "Known Risks" no TechSpec).

### Relevant Files

- `.compozy/tasks/url-shortener/_techspec.md` — Data Models (linhas ~130-208): schema e as 3 queries.
- `.compozy/tasks/url-shortener/adrs/adr-004.md` — raciocínio completo da CTE recursiva e timestamps UTC.
- `src/db/schema.ts`, `src/db/connection.ts`, `src/db/index.ts` — schema e conexão já existentes; repositórios recebem uma instância `Database` já aberta.
- `src/db/schema.test.ts` — mostra o padrão já em uso no projeto para testes com `:memory:` (um `beforeEach`/`afterEach` por teste).

### Dependent Files

- `src/services/shorten-service.ts`, `src/services/redirect-service.ts` (task_03) — chamam `links-repository` e `clicks-repository`.
- `src/services/urls-service.ts`, `src/services/stats-service.ts` (task_04) — chamam `listAllWithClickCounts`, `countByLinkId`, `getClicksByDay`, `getTopReferrers`.

### Related ADRs

- [ADR-004: Timestamps ISO 8601 UTC e clicksByDay via CTE recursiva](adrs/adr-004.md) — modelo de dados e query de agregação a implementar exatamente como especificado.

## Deliverables

- `src/repositories/links-repository.ts`, `src/repositories/clicks-repository.ts` criados.
- Every test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] IT-001 — `links-repository`: insert seguido de `findByShortCode` retorna os campos persistidos.
- [ ] IT-002 — `links-repository`: segundo insert com `short_code` repetido viola `UNIQUE`.
- [ ] IT-003 — `clicks-repository`: `insertClick` 5x + `countByLinkId` retorna 5.
- [ ] IT-004 — `clicks-repository`: `getClicksByDay` retorna exatamente 30 linhas zero-preenchidas, excluindo clique fora da janela.
- [ ] IT-005 — `clicks-repository`: `countByLinkId` inclui cliques fora da janela de 30 dias.
- [ ] IT-006 — `clicks-repository`: `getTopReferrers` agrupa `null` sob `'direto'`.

## Success Criteria

- Every assigned test case implemented and passing
- Nenhum outro módulo do projeto importa `better-sqlite3` além de `repositories/*.ts`
- Nenhuma query usa concatenação de string com valor externo
