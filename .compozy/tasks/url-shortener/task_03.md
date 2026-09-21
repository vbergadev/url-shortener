---
status: pending
title: "Serviços de escrita: encurtar e redirecionar"
type: backend
complexity: medium
---

# Task 3: Serviços de escrita: encurtar e redirecionar

## Overview

Implementa a regra de negócio de criação de link (validação de URL/expiração +
geração de short code com retry em colisão) e de redirecionamento (checagem de
expiração + registro de clique), consumindo as peças da task_01 e as interfaces de
repositório da task_02 — mas atrás de fakes em teste, sem I/O real nesta camada.
Independente da task_04: pode ser implementada em paralelo assim que a task_02
terminar.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every test case assigned in ## Tests
</critical>

<requirements>
- MUST implement `src/services/shorten-service.ts` `createLink(input)`: valida `url` (lança `InvalidUrlError`), parseia `expiresAt` (lança `InvalidExpiresAtError`), gera um código via `CodeGenerator` e insere via `links-repository`.
- MUST retry code generation on a `UNIQUE`-violation signal from the repository, up to 5 attempts total, generating a fresh code each time; on the 5th failure MUST throw `CodeGenerationExhaustedError` without ever persisting a partial/duplicate record.
- MUST implement `src/services/redirect-service.ts` `resolve(code, meta)`: busca o link por código (`LinkNotFoundError` se ausente), compara `expiresAt` contra `clock.now()` com limite **inclusivo** (`expiresAt <= now` → `LinkExpiredError`), e só registra o clique (via `clicks-repository`) no caminho feliz.
- MUST normalize missing `referrer`/`userAgent` to `null` in the recorded click — never `undefined`, never an empty string.
- MUST inject `Clock` and `CodeGenerator` as constructor/factory parameters — never call `new Date()`, `Math.random()`, or `crypto.randomBytes` directly inside a service (CLAUDE.md 1.3, non-flaky tests).
- MUST test both services against fake repositories implementing the same interface as task_02's real repositories — zero real I/O (no `better-sqlite3`, no `:memory:`) in this task's tests.
- MUST NOT swallow any `AppError` — every thrown error propagates untouched to the caller; no `catch` block in either service that logs-and-continues (CLAUDE.md code smell #15).
</requirements>

## Subtasks

- [ ] 3.1 `shorten-service.ts`: caminho feliz (validação + geração + persistência).
- [ ] 3.2 `shorten-service.ts`: retry de colisão com fila de códigos controlada em teste, limite de 5 tentativas.
- [ ] 3.3 `shorten-service.ts`: casos de erro (`InvalidUrlError`, `InvalidExpiresAtError`, `CodeGenerationExhaustedError`).
- [ ] 3.4 `redirect-service.ts`: caminho feliz + registro de clique com metadados corretos.
- [ ] 3.5 `redirect-service.ts`: `LinkNotFoundError`, `LinkExpiredError` (borda inclusiva), link sem `expiresAt` nunca expira.
- [ ] 3.6 `redirect-service.ts`: normalização de `referrer`/`userAgent` ausentes para `null`.
- [ ] 3.7 Fakes de repositório reutilizáveis (`test/helpers/fake-repositories.ts`) implementando a mesma interface da task_02.
- [ ] 3.8 Escrever os 10 testes unitários atribuídos (ver `## Tests`).
- [ ] 3.9 Rodar Definition of Done (`npm test`, `npm run lint`, `npm run build`) e confirmar saída real.

## Implementation Details

Ver `_techspec.md`, seção "Core Interfaces" para `ShortenService`/`RedirectService`, e
"Technical Considerations → Key Decisions" para o racional do retry via
`UNIQUE`+catch (sem `SELECT` de existência prévia — `better-sqlite3` é síncrono, não
há race condition dentro do processo).

### Relevant Files

- `.compozy/tasks/url-shortener/_techspec.md` — Core Interfaces (`ShortenService`, `RedirectService`) e Key Decisions sobre retry.
- `.compozy/tasks/url-shortener/adrs/adr-002.md` — geração de short code, retry em colisão, sem dedupe de URL.
- `.compozy/tasks/url-shortener/_tests.md` — definições completas de UT-015 a UT-024.

### Dependent Files

- `src/lib/clock.ts`, `src/lib/url-validator.ts`, `src/lib/expires-at-parser.ts`, `src/lib/code-generator.ts`, `src/errors/app-errors.ts`, `src/domain/types.ts` (task_01) — importados diretamente.
- `src/repositories/links-repository.ts`, `src/repositories/clicks-repository.ts` (task_02) — a assinatura (interface) é o contrato; os testes desta task usam fakes, não a implementação real.
- `src/routes/shorten.routes.ts`, `src/routes/redirect.routes.ts` (task_05) — vão chamar `shorten-service.createLink` e `redirect-service.resolve`.

### Related ADRs

- [ADR-002: Geração de short code — aleatório com retry em colisão, sem dedupe de URL](adrs/adr-002.md)
- [ADR-003: Arquitetura em camadas com dependências injetáveis](adrs/adr-003.md)

## Deliverables

- `src/services/shorten-service.ts`, `src/services/redirect-service.ts` criados.
- `test/helpers/fake-repositories.ts` (ou equivalente) reutilizável por outras tasks.
- Every test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-015, UT-016 — `shorten-service`: caminho feliz sem/com `expiresAt`.
- [ ] UT-017 — `shorten-service`: `InvalidUrlError` propaga, nada é inserido.
- [ ] UT-018 — `shorten-service`: retry em colisão de código, resultado usa o segundo código.
- [ ] UT-019 — `shorten-service`: `CodeGenerationExhaustedError` após 5 tentativas, nada é inserido.
- [ ] UT-020 — `redirect-service`: caminho feliz registra o clique com os metadados corretos.
- [ ] UT-021 — `redirect-service`: `LinkNotFoundError`, zero cliques registrados.
- [ ] UT-022 — `redirect-service`: `LinkExpiredError` na borda inclusiva (`expiresAt === now`), zero cliques.
- [ ] UT-023 — `redirect-service`: link sem `expiresAt` nunca expira.
- [ ] UT-024 — `redirect-service`: `referrer`/`userAgent` ausentes viram `null` no clique registrado.

## Success Criteria

- Every assigned test case implemented and passing
- Zero I/O real nos testes desta task (só fakes)
- Retry nunca excede 5 tentativas; nenhum registro parcial é persistido em falha
- Borda de expiração é sempre inclusiva (`<=`)
