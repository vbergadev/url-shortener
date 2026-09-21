---
status: pending
title: "Serviços de leitura: listagem, estatísticas e página de analytics"
type: backend
complexity: low
---

# Task 4: Serviços de leitura: listagem, estatísticas e página de analytics

## Overview

Implementa a listagem de links com contagem de cliques, o cálculo de estatísticas
agregadas (total, últimos 30 dias, top referrers) e a renderização HTML da página
de analytics — todos consumindo as interfaces de repositório da task_02 atrás de
fakes em teste, sem tocar Fastify nem SQL diretamente. Independente da task_03:
pode ser implementada em paralelo assim que a task_02 terminar.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every test case assigned in ## Tests
</critical>

<requirements>
- MUST implement `src/services/urls-service.ts` `listLinksWithCounts()`: delega para `links-repository.listAllWithClickCounts()`, retorna `[]` quando não há links, sem paginação (PRD Non-Goals).
- MUST implement `src/services/stats-service.ts` `getStats(code)`: resolve o link por código (`LinkNotFoundError` — mesmo erro de domínio de `errors/app-errors.ts` — se ausente), monta `{ totalClicks, clicksByDay, topReferrers }` a partir de `clicks-repository`; funciona igual para link expirado (stats não considera expiração — ver PRD).
- MUST implement `src/views/analytics-page.ts` `renderAnalyticsPage(stats: LinkStats): string`: função pura, sem estado e sem I/O, retorna HTML com o total em destaque, uma marcação por dia de `clicksByDay` (30) e a lista de `topReferrers`; estado de zero cliques renderiza texto explícito de "0 cliques", nunca uma tabela vazia sem contexto.
- MUST NOT import Fastify nem qualquer tipo HTTP em `views/analytics-page.ts` — recebe e devolve apenas dados/string.
- SHOULD escapar qualquer string vinda de dado do usuário (valor de `referrer`) antes de interpolar no HTML — não é requisito de segurança do PRD, é correção: um referrer contendo `<`/`>` não pode quebrar a marcação.
- MUST test both services against fake repositories — zero real I/O in this task's tests.
</requirements>

## Subtasks

- [ ] 4.1 `urls-service.ts`: `listLinksWithCounts` caminho feliz e caso vazio.
- [ ] 4.2 `stats-service.ts`: `getStats` caminho feliz (total, 30 dias, top referrers).
- [ ] 4.3 `stats-service.ts`: `LinkNotFoundError` e caso de link sem nenhum clique.
- [ ] 4.4 `views/analytics-page.ts`: renderização do caminho feliz.
- [ ] 4.5 `views/analytics-page.ts`: estado de zero cliques.
- [ ] 4.6 Reaproveitar fakes de repositório de `test/helpers/fake-repositories.ts` (criados na task_03) ou criar aqui se a task_03 ainda não estiver mesclada.
- [ ] 4.7 Escrever os 8 testes unitários atribuídos (ver `## Tests`).
- [ ] 4.8 Rodar Definition of Done (`npm test`, `npm run lint`, `npm run build`) e confirmar saída real.

## Implementation Details

Ver `_techspec.md`, seção "API Endpoints" para os formatos exatos de resposta de
`GET /api/urls`, `GET /api/stats/:code` e `GET /analytics/:code` — os services desta
task produzem exatamente esses formatos, para as rotas da task_05 apenas serializarem.

### Relevant Files

- `.compozy/tasks/url-shortener/_techspec.md` — API Endpoints (`GET /api/urls`, `GET /api/stats/:code`, `GET /analytics/:code`).
- `.compozy/tasks/url-shortener/_tests.md` — definições completas de UT-025 a UT-032.

### Dependent Files

- `src/domain/types.ts` (`LinkStats`), `src/errors/app-errors.ts` (task_01) — importados diretamente.
- `src/repositories/links-repository.ts`, `src/repositories/clicks-repository.ts` (task_02) — a assinatura (interface) é o contrato; os testes desta task usam fakes.
- `test/helpers/fake-repositories.ts` (task_03) — reaproveitado se já existir; se as duas tasks rodarem em paralelo sem esse arquivo ainda mesclado, criar uma versão local e conciliar na integração (task_05).
- `src/routes/urls.routes.ts`, `src/routes/stats.routes.ts`, `src/routes/analytics.routes.ts` (task_05) — vão chamar `urls-service.listLinksWithCounts`, `stats-service.getStats` e `views/analytics-page.renderAnalyticsPage`.

## Deliverables

- `src/services/urls-service.ts`, `src/services/stats-service.ts`, `src/views/analytics-page.ts` criados.
- Every test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-025 — `urls-service`: lista ordenada por `createdAt` decrescente com `clickCount` correto.
- [ ] UT-026 — `urls-service`: repositório vazio retorna `[]`.
- [ ] UT-027 — `stats-service`: caminho feliz com múltiplos referrers e dias.
- [ ] UT-028 — `stats-service`: código inexistente lança `LinkNotFoundError`.
- [ ] UT-029 — `stats-service`: link sem nenhum clique retorna zerado/vazio nos três campos.
- [ ] UT-030 — `stats-service`: clique fora da janela de 30 dias entra em `totalClicks` mas não em `clicksByDay`.
- [ ] UT-031 — `views/analytics-page`: render do caminho feliz contém total e referrer.
- [ ] UT-032 — `views/analytics-page`: render de zero cliques mostra estado explícito, não quebrado.

## Success Criteria

- Every assigned test case implemented and passing
- `renderAnalyticsPage` nunca lança exceção para entrada de zero cliques
- Nenhum import de Fastify/HTTP em `views/analytics-page.ts`
