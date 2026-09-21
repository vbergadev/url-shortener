---
status: pending
title: "Rotas HTTP, wiring do app e jornadas completas"
type: backend
complexity: high
---

# Task 5: Rotas HTTP, wiring do app e jornadas completas

## Overview

Registra as 5 rotas Fastify sobre os serviços das tasks 3 e 4, monta o error
handler global que mapeia cada `AppError` para status HTTP, estende `buildApp()`
com essas dependências reais, e prova as jornadas completas do PRD via
`app.inject()`. É a task que fecha o sistema — depende de tudo antes dela e tem a
maior superfície de integração do projeto.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every test case assigned in ## Tests
</critical>

<requirements>
- MUST register `POST /api/shorten`, `GET /:code`, `GET /api/urls`, `GET /api/stats/:code`, `GET /analytics/:code` exactly per `_techspec.md`'s API Endpoints contracts (status codes, body shapes, `shortUrl = ${BASE_URL}/${shortCode}`).
- MUST validate `POST /api/shorten`'s body with a Fastify JSON Schema (`url` required, `expiresAt` optional) — a schema failure returns `400 VALIDATION_ERROR`, distinct from the `InvalidUrlError`/`InvalidExpiresAtError` thrown by the service for a well-formed-but-invalid value.
- MUST implement one global error handler mapping every `AppError` subclass (task_01) to `{ error: { code, message } }` with its `statusCode`, plus an `INTERNAL_ERROR` 500 fallback for anything unmapped — MUST NOT leak a stack trace or infrastructure detail in the response body (log server-side only, per `_techspec.md` Monitoring and Observability).
- MUST make every `/api/*` error response JSON and every `/analytics/:code` error response HTML (including its 404) — an explicit TechSpec decision, not left to Fastify's defaults.
- MUST extend `buildApp()` (already scaffolded in `src/app.ts` with only `/health`) to accept and wire `Clock`, `CodeGenerator`, the two repositories, and the four services — defaulting to production instances but overridable, so integration tests can inject `fixedClock`/`:memory:` without touching `server.ts`.
- MUST wire `src/server.ts` to call `buildApp()` with production dependencies (system clock, real code generator, file-backed `better-sqlite3` from `DATABASE_URL`) — no behavior change to its existing `.listen()` responsibility.
- MUST NOT let a route handler contain business logic beyond calling a service and mapping its result/error to an HTTP response (CLAUDE.md code smell #6 — no business rule creeps into `routes/*`).
</requirements>

## Subtasks

- [ ] 5.1 Error handler global (`AppError` → JSON) + `VALIDATION_ERROR`/`INTERNAL_ERROR`.
- [ ] 5.2 `routes/shorten.routes.ts` (`POST /api/shorten`) com JSON Schema de validação.
- [ ] 5.3 `routes/redirect.routes.ts` (`GET /:code`).
- [ ] 5.4 `routes/urls.routes.ts` (`GET /api/urls`).
- [ ] 5.5 `routes/stats.routes.ts` (`GET /api/stats/:code`).
- [ ] 5.6 `routes/analytics.routes.ts` (`GET /analytics/:code`, erro em HTML, não JSON).
- [ ] 5.7 Estender `buildApp()` para aceitar dependências reais/injetáveis e registrar as 5 rotas; atualizar `server.ts` para produção.
- [ ] 5.8 `test/helpers/build-test-app.ts` (monta `buildApp` com `:memory:` + clock/code-generator fixos para os testes).
- [ ] 5.9 Escrever os 15 testes de integração atribuídos (ver `## Tests`).
- [ ] 5.10 Escrever os 3 testes E2E atribuídos (ver `## Tests`).
- [ ] 5.11 Atualizar README com exemplo de uso real (curl de cada endpoint) e confirmar o demo com `run.sh` ponta a ponta.
- [ ] 5.12 Rodar Definition of Done (`npm test`, `npm run lint`, `npm run build`) e confirmar saída real.

## Implementation Details

Ver `_techspec.md`, seção "API Endpoints" (contrato exato de cada rota) e "System
Architecture → Component Overview" (routes → services → repositories, sentido único
de dependência). O `buildApp()` já existe em `src/app.ts` com a rota `/health` —
estender, não recriar.

### Relevant Files

- `.compozy/tasks/url-shortener/_techspec.md` — API Endpoints (todas as 5 rotas) e Component Overview.
- `.compozy/tasks/url-shortener/_tests.md` — definições completas de IT-007 a IT-021 e E2E-001 a E2E-003.
- `src/app.ts`, `src/app.test.ts` — `buildApp()` e o padrão de teste via `app.inject()` já estabelecido pela rota `/health`.
- `src/server.ts` — entry point de produção a atualizar com as dependências reais.
- `README.md` — seções de demo a preencher com os endpoints reais e o passo a passo de `run.sh`.

### Dependent Files

- `src/services/shorten-service.ts`, `src/services/redirect-service.ts` (task_03).
- `src/services/urls-service.ts`, `src/services/stats-service.ts`, `src/views/analytics-page.ts` (task_04).
- `src/errors/app-errors.ts` (task_01) — mapeamento completo no error handler global.

### Related ADRs

- [ADR-004: Timestamps ISO 8601 UTC e clicksByDay via CTE recursiva](adrs/adr-004.md) — decisão de erro JSON vs. HTML por tipo de rota está registrada no `_techspec.md` Key Decisions, motivada pela mesma revisão.

## Deliverables

- `src/routes/shorten.routes.ts`, `src/routes/redirect.routes.ts`, `src/routes/urls.routes.ts`, `src/routes/stats.routes.ts`, `src/routes/analytics.routes.ts` criados.
- Error handler global registrado em `buildApp()`.
- `src/app.ts` e `src/server.ts` atualizados com as dependências reais.
- README com exemplo de demo funcionando de ponta a ponta via `run.sh`.
- Every test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] IT-007, IT-008, IT-009, IT-010 — `POST /api/shorten`: caminho feliz, body sem `url`, protocolo inválido, `expiresAt` válido.
- [ ] IT-011, IT-012, IT-013, IT-014 — `GET /:code`: redirect + tracking, 404, 410, concorrência sem perda de clique.
- [ ] IT-015, IT-016 — `GET /api/urls`: vazio, ordenado com `clickCount`.
- [ ] IT-017, IT-018, IT-019 — `GET /api/stats/:code`: 404, caminho feliz, sem cliques.
- [ ] IT-020, IT-021 — `GET /analytics/:code`: caminho feliz em HTML, 404 em HTML.
- [ ] E2E-001 — jornada completa: criar → 3 cliques com referrers distintos → listar → stats.
- [ ] E2E-002 — link expirado nunca contabiliza clique.
- [ ] E2E-003 — página de analytics reflete os cliques reais.

## Success Criteria

- Every assigned test case implemented and passing
- `npm run dev` sobe e as 5 rotas respondem conforme o contrato do TechSpec
- Demo manual funciona ponta a ponta: `./run.sh` → criar link → clicar algumas vezes → abrir `/analytics/:code` no navegador
- Nenhuma regra de negócio em `routes/*.ts` além de chamar o service e mapear o resultado
