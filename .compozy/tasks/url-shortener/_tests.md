# Test Specification: URL Shortener

Canonical test contract para o URL Shortener. Companion de `_techspec.md`.
Derivado de `_user_stories.md` (comportamento) e `_techspec.md` (componentes).

## Strategy

- **Frameworks e harnesses**: Vitest. Fakes só nas bordas de I/O: repositórios fake
  em memória (mesma interface dos repositórios reais) para testes unitários de
  `services/*`; `Clock`/`CodeGenerator` sempre injetados (fixo ou fila controlada),
  nunca mock de módulo global (`vi.mock`, `vi.setSystemTime`) — ver ADR-003.
- **Execução**: unit e integration rodam no mesmo `vitest run`, sem servidor real
  escutando porta. Integração usa `better-sqlite3` com `:memory:` via
  `buildApp()`; rotas são exercitadas com `app.inject()`. "E2E" nesta suíte é uma
  integração que encadeia múltiplas chamadas `app.inject()` reproduzindo uma
  jornada completa do PRD (sem browser real — ver `_techspec.md`, Testing Approach).
- **Convenções**: um arquivo de teste por componente (`shorten-service.test.ts`,
  `links-repository.test.ts`, `shorten.routes.test.ts`, ...); cada teste monta seu
  próprio `:memory:`/fakes em `beforeEach` e não compartilha estado com outros
  testes; testes podem rodar em qualquer ordem e em paralelo (regra 1.3 do
  `CLAUDE.md`).

## Coverage Matrix

| Source | Behavior | Unit | Integration | E2E |
|---|---|---|---|---|
| US-001 (AC-1,2,3) | Encurtar URL válida, sem dedupe, sem colisão persistida | UT-015, UT-016, UT-018, UT-019 | IT-007 | E2E-001 |
| US-001.EC-1 | Query string + fragmento preservados | UT-010 | — | — |
| US-001.EC-2 | URL extremamente longa aceita | — | — (trivial: sem limite de tamanho implementado) | — |
| US-001.EC-3 | Body sem `url` → 400 | — | IT-008 | — |
| US-001.EC-4 | Body não é JSON válido → 400 | — | — (parsing do Fastify, não é lógica nossa) | — |
| US-002 (AC-1,2) | `expiresAt` opcional, normalizado | UT-011, UT-012, UT-013, UT-016 | IT-010 | — |
| US-002.EC-1 | `expiresAt` no passado aceito na criação | — | — | E2E-002 |
| US-002.EC-2 | `expiresAt` malformado → 400 | UT-014 | — | — |
| US-002.EC-3 | `expiresAt` com timezone não-UTC normalizado | UT-013 | — | — |
| US-003 (AC-1,2) | Rejeitar protocolo/URL inválida | UT-006, UT-007 | IT-009 | — |
| US-003.EC-1 | URL vazia → 400 | UT-008 | — | — |
| US-003.EC-2 | URL sem protocolo → 400 | UT-009 | — | — |
| US-003.EC-3 | Protocolo maiúsculo aceito | UT-005 | — | — |
| US-004 (AC-1,2) | Redirect 301 + tracking de clique | UT-020, UT-024 | IT-011 | E2E-001, E2E-003 |
| US-004.EC-1 | Sem `Referer` → `referrer: null` | UT-024 | — | — |
| US-004.EC-2 | Sem `User-Agent` → `userAgent: null` | UT-024 | — | — |
| US-004.EC-3 | Cliques concorrentes, sem perda | — | IT-014 | — |
| US-004.EC-4 | 100 cliques, todos contabilizados | — | — (coberto pela prova de concorrência em IT-014) | — |
| US-005 (AC-1) | 404 para código inexistente, sem clique | UT-021 | IT-012 | — |
| US-005.EC-1 | Código com caracteres fora do alfabeto → 404 | — | — | — |
| US-006 (AC-1,2) | 410 para expirado, sem contar clique | UT-022 | IT-013 | E2E-002 |
| US-006.EC-1 | `expiresAt === now` → 410 (borda inclusiva) | UT-022 | — | — |
| US-006.EC-2 | Sem `expiresAt` nunca expira | UT-023 | — | — |
| US-007 (AC-1,2,3) | Listagem ordenada com `clickCount` | UT-025 | IT-016 | E2E-001 |
| US-007.EC-1 | Nenhum link → `[]` | UT-026 | IT-015 | — |
| US-007.EC-2 | Link sem clique → `clickCount: 0` | UT-026 | IT-015 | — |
| US-007.EC-3 | Volume alto de links, lista completa | — | — | — (sem paginação; ver Non-Goals) |
| US-008 (AC-1,2,3) | Stats: total, 30 dias, top referrers | UT-027 | IT-018 | E2E-001 |
| US-008.EC-1 | Sem clique: zerado/vazio | UT-029 | IT-019 | — |
| US-008.EC-2 | Código inexistente → 404 | UT-028 | IT-017 | — |
| US-008.EC-3 | Referrer nulo agrupado sob "direto" | UT-027 | IT-006, IT-018 | — |
| US-008.EC-4 | >30 dias de histórico: só últimos 30 no `clicksByDay` | UT-030 | IT-004, IT-005 | — |
| US-009 (AC-1,2) | Página HTML de analytics | UT-031 | IT-020 | E2E-003 |
| US-009.EC-1 | Código inexistente → página de erro | — | IT-021 | — |
| US-009.EC-2 | Zero cliques → estado "0 cliques" | UT-032 | — | — |
| US-009.EC-3 | Link expirado ainda acessível em analytics | — | — | — |
| `lib/clock` | `Clock` real/fixo | UT-001 | — | — |
| `lib/code-generator` | Alfabeto e tamanho do código | UT-002, UT-003 | — | — |
| `errors/app-errors` | `code`/`statusCode` corretos por classe | UT-033 | — | — |
| `repositories/links-repository` | Persistência e unicidade | — | IT-001, IT-002 | — |
| `repositories/clicks-repository` | Persistência e contagem | — | IT-003 | — |

### Recalibração unit vs. integration (revisão pós-geração)

A primeira versão deste contrato saiu com 33 unit / 34 integration / 5 E2E — uma
proporção próxima de 1:1 que não reflete a forma real de um serviço fino como
este. Revisado para **33 unit / 21 integration / 3 E2E**:

- **Mantido em Integration só o que não tem substituto em unit**: as 6 queries
  SQL (constraint `UNIQUE`, CTE dos 30 dias, `GROUP BY` de referrers) só podem
  ser verificadas contra um banco real — não têm equivalente em unit; o teste de
  concorrência (`IT-014`) idem, precisa de I/O real disparado em paralelo. O
  resto de Integration por rota ficou reduzido a um caso feliz + os erros que
  provam que o mapeamento de status HTTP está de fato ligado ao serviço (não a
  reexercitar cada regra de validação já coberta em unit).
- **Cortado por redundância direta com unit**: casos de borda que a suíte de
  `services/*` já prova com fake repository (`referrer`/`user-agent` nulos,
  `expiresAt === now`, retry de colisão, 100 vs. 10 cliques) não ganham uma
  segunda prova idêntica atravessando HTTP + SQLite de verdade — o risco de
  wiring já está coberto pelo caso feliz da mesma rota.
- **Cortado por risco desprezível**: comportamento do parser de JSON do Fastify
  e ausência de limite de tamanho de URL (nunca implementamos um limite, então
  não há o que quebrar).
- **E2E** reduzido de 5 para 3: mantidas as duas jornadas de negócio cruzadas
  (criação→cliques→stats; expiração nunca conta) e a jornada de valor central do
  produto (analytics reflete cliques reais); as outras duas apenas repetiam, em
  sequência, um caso já coberto isoladamente em Integration.

IDs de teste foram renumerados nesta revisão (nada os consumia ainda — nenhuma
task nem código foi gerado a partir da versão anterior).

## Unit Tests

### `lib/clock.ts` (TechSpec: Core Interfaces)

- **UT-001** (happy): `fixedClock(new Date('2026-01-15T10:00:00.000Z')).now()` —
  chamado duas vezes seguidas, retorna o mesmo instante (`.toISOString()` idêntico
  nas duas chamadas), confirmando que o clock de teste não deriva do relógio real.

### `lib/code-generator.ts` (TechSpec: Core Interfaces)

- **UT-002** (happy): `randomCodeGenerator().generate()` — retorna uma string que
  casa com `/^[A-Za-z0-9]{7}$/`.
- **UT-003** (boundary): gerar 1000 códigos com `randomCodeGenerator().generate()` —
  todo caractere de todos os códigos pertence ao alfabeto `[A-Za-z0-9]` e todo
  código tem exatamente 7 caracteres (propriedade estrutural, não valor específico
  — não depende de seed).

### `lib/url-validator.ts` (TechSpec: Core Interfaces)

- **UT-004** (happy): `validateUrl('https://example.com/pagina')` — não lança e
  retorna `'https://example.com/pagina'`.
- **UT-005** (happy): `validateUrl('HTTPS://example.com')` — não lança (protocolo
  case-insensitive).
- **UT-006** (error): `validateUrl('ftp://example.com')` — lança `InvalidUrlError`.
- **UT-007** (error): `validateUrl('não é url')` — lança `InvalidUrlError`.
- **UT-008** (error): `validateUrl('')` — lança `InvalidUrlError`.
- **UT-009** (error): `validateUrl('example.com')` — lança `InvalidUrlError` (sem
  protocolo, sem resolução implícita de esquema).
- **UT-010** (boundary): `validateUrl('https://example.com/p?a=1#b')` — retorna a
  string exatamente igual à entrada (query string e fragmento preservados).

### `lib/expires-at-parser.ts` (TechSpec: Core Interfaces)

- **UT-011** (happy): `parseExpiresAt(undefined)` — retorna `null`.
- **UT-012** (happy): `parseExpiresAt('2026-12-31T00:00:00Z')` — retorna Date cujo
  `.toISOString()` é `'2026-12-31T00:00:00.000Z'`.
- **UT-013** (happy): `parseExpiresAt('2026-12-31T00:00:00-03:00')` — retorna Date
  cujo `.toISOString()` é `'2026-12-31T03:00:00.000Z'` (normalizado para UTC).
- **UT-014** (error): `parseExpiresAt('not-a-date')` — lança `InvalidExpiresAtError`.

### `services/shorten-service.ts` (TechSpec: Core Interfaces)

- **UT-015** (happy): `createLink({ url: 'https://example.com' })` com fake repo
  vazio, clock fixo em `2026-01-15T10:00:00.000Z` e code generator retornando
  `'ABCDEFG'` — retorna
  `{ shortCode: 'ABCDEFG', originalUrl: 'https://example.com', createdAt: '2026-01-15T10:00:00.000Z', expiresAt: null }`.
- **UT-016** (happy): `createLink({ url: 'https://example.com', expiresAt: '2026-02-01T00:00:00Z' })`
  — retorna `expiresAt: '2026-02-01T00:00:00.000Z'`.
- **UT-017** (error): `createLink({ url: 'ftp://x' })` — lança `InvalidUrlError`; o
  fake repository permanece com zero registros inseridos.
- **UT-018** (concurrency): code generator configurado com fila
  `['DUPCODE', 'UNIQUE1']`; fake repository pré-populado com um link de
  `shortCode: 'DUPCODE'` que rejeita o segundo insert com o mesmo código
  (simulando a constraint `UNIQUE`) — `createLink(...)` retorna
  `shortCode: 'UNIQUE1'` e o fake repository registra exatamente duas tentativas
  de insert.
- **UT-019** (error/boundary): code generator retorna sempre `'DUPCODE'` (fila de
  5 valores iguais); fake repository sempre rejeita esse código — `createLink(...)`
  lança `CodeGenerationExhaustedError` após a 5ª tentativa, sem inserir nenhum
  registro.

### `services/redirect-service.ts` (TechSpec: Core Interfaces)

- **UT-020** (happy): link não expirado no fake repo; `resolve(code, { referrer: 'https://google.com', userAgent: 'ua-1', ip: '1.2.3.4' })`
  — retorna `{ originalUrl }` e o fake clicks repo recebe exatamente um registro
  com `referrer: 'https://google.com'`, `userAgent: 'ua-1'`, `ip: '1.2.3.4'`,
  `createdAt` igual ao clock injetado.
- **UT-021** (error): código inexistente no fake repo — `resolve(...)` lança
  `LinkNotFoundError`; fake clicks repo permanece com zero registros.
- **UT-022** (boundary): link com `expiresAt` igual, ao milissegundo, ao
  `clock.now()` injetado — `resolve(...)` lança `LinkExpiredError` (borda
  inclusiva); fake clicks repo permanece com zero registros.
- **UT-023** (happy): link com `expiresAt: null` e clock ajustado para uma data
  distante no futuro — `resolve(...)` não lança e retorna `{ originalUrl }`.
- **UT-024** (state): `resolve(code, { referrer: undefined, userAgent: undefined, ip: '1.2.3.4' })`
  — o registro inserido no fake clicks repo tem `referrer: null` e
  `userAgent: null` (nunca `undefined` nem string vazia).

### `services/urls-service.ts` (TechSpec: Core Interfaces)

- **UT-025** (happy): fake repo retorna 2 links com contagens pré-computadas
  (`3` e `0`) — `listLinksWithCounts()` retorna os 2 itens com `clickCount`
  correspondente e ordenados por `createdAt` decrescente.
- **UT-026** (boundary): fake repo vazio — `listLinksWithCounts()` retorna `[]`.

### `services/stats-service.ts` (TechSpec: Core Interfaces)

- **UT-027** (happy): fake repo com um link e cliques fixture (2 em
  `referrer: 'https://a.com'`, 1 com `referrer: null`, todos dentro dos últimos
  30 dias relativos ao clock fixo) — `getStats(code)` retorna `totalClicks: 3`,
  `clicksByDay` com exatamente 30 itens, `topReferrers` igual a
  `[{ referrer: 'https://a.com', count: 2 }, { referrer: 'direto', count: 1 }]`.
- **UT-028** (error): código inexistente no fake repo — `getStats(...)` lança
  `LinkNotFoundError`.
- **UT-029** (boundary): link sem nenhum clique — `getStats(...)` retorna
  `totalClicks: 0`, os 30 itens de `clicksByDay` todos com `count: 0`,
  `topReferrers: []`.
- **UT-030** (boundary): fake repo com 1 clique há 40 dias (fora da janela) e 1
  clique hoje — `getStats(...)` retorna `totalClicks: 2`, mas a soma de
  `count` em `clicksByDay` é `1` (o clique de 40 dias atrás não entra nos 30 dias).

### `views/analytics-page.ts` (TechSpec: API Endpoints — `GET /analytics/:code`)

- **UT-031** (happy): `renderAnalyticsPage(stats)` com `totalClicks: 42` e
  `topReferrers: [{ referrer: 'direto', count: 42 }]` — o HTML retornado contém a
  string `'42'` e a string `'direto'`, e contém 30 marcações de dia (uma por item
  de `clicksByDay`).
- **UT-032** (boundary): `renderAnalyticsPage(stats)` com `totalClicks: 0` e
  `topReferrers: []` — o HTML retornado contém um texto de estado vazio (ex.:
  `'0 cliques'`), não uma tabela/lista quebrada ou omitida.

### `errors/app-errors.ts` (TechSpec: Core Interfaces)

- **UT-033** (state): instanciar cada uma das 5 classes de erro
  (`InvalidUrlError`, `InvalidExpiresAtError`, `LinkNotFoundError`,
  `LinkExpiredError`, `CodeGenerationExhaustedError`) — cada uma expõe o par
  `{ code, statusCode }` exato definido na TechSpec (ex.: `LinkNotFoundError` →
  `code: 'LINK_NOT_FOUND'`, `statusCode: 404`).

## Integration Tests

### `repositories/links-repository.ts` (TechSpec: Data Models)

- **IT-001**: `insert({ shortCode: 'AbC123x', originalUrl: 'https://x.com', createdAt, expiresAt: null })`
  seguido de `findByShortCode('AbC123x')` em `better-sqlite3` `:memory:` — retorna
  um registro com todos os campos persistidos exatamente iguais aos inseridos.
- **IT-002**: dois `insert(...)` com o mesmo `shortCode` — a segunda chamada lança
  um erro de violação de constraint `UNIQUE` (confirma que `idx_links_short_code`
  existe e é único).

### `repositories/clicks-repository.ts` (TechSpec: Data Models)

- **IT-003**: `insertClick(...)` chamado 5 vezes para o mesmo `linkId` — `countByLinkId(linkId)`
  retorna `5`.
- **IT-004**: cliques semeados em datas específicas (hoje, hoje-1, hoje-29,
  hoje-40) para um `linkId` — `getClicksByDay(linkId, today)` retorna exatamente 30
  linhas cobrindo `today-29` até `today`, com `count: 1` nos dias semeados dentro
  da janela e `count: 0` nos demais; o clique de `today-40` não aparece em nenhuma
  linha.
- **IT-005**: mesmo fixture de IT-004 — `countByLinkId(linkId)` retorna `4` (inclui
  o clique de `today-40`, fora da janela de 30 dias mas dentro do total).
- **IT-006**: cliques semeados com `referrer` `'https://a.com'` (x2), `null` (x1) —
  `getTopReferrers(linkId)` retorna
  `[{ referrer: 'https://a.com', count: 2 }, { referrer: 'direto', count: 1 }]`.

### `routes/shorten.routes.ts` (TechSpec: `POST /api/shorten`)

- **IT-007**: `app.inject({ method: 'POST', url: '/api/shorten', payload: { url: 'https://example.com' } })`
  — `201`, corpo contém `shortCode` casando `/^[A-Za-z0-9]{7}$/`, `originalUrl: 'https://example.com'`, `expiresAt: null`.
- **IT-008**: payload `{}` (sem `url`) — `400`, `error.code: 'VALIDATION_ERROR'`.
- **IT-009**: payload `{ url: 'ftp://example.com' }` — `400`,
  `error.code: 'INVALID_URL'`.
- **IT-010**: payload `{ url: 'https://example.com', expiresAt: '2026-12-31T00:00:00Z' }`
  — `201`, `expiresAt: '2026-12-31T00:00:00.000Z'`.

### `routes/redirect.routes.ts` (TechSpec: `GET /:code`)

- **IT-011**: link ativo criado via `POST /api/shorten`; `app.inject({ method: 'GET', url: '/<code>' })`
  — `301`, header `location` igual à `originalUrl`; `GET /api/stats/<code>` em
  seguida mostra `totalClicks: 1`.
- **IT-012**: `GET /codigoquenuncaexistiu` — `404`,
  `error.code: 'LINK_NOT_FOUND'`; `GET /api/stats/codigoquenuncaexistiu` continua
  `404` (nenhum link foi criado por engano).
- **IT-013**: link criado com `expiresAt` no passado (clock fixo injetado) —
  `GET /<code>` — `410`, `error.code: 'LINK_EXPIRED'`; `GET /api/stats/<code>`
  mostra `totalClicks: 0`.
- **IT-014**: link ativo; disparar 10 `app.inject({ method: 'GET', url: '/<code>' })`
  em paralelo via `Promise.all` — todas as 10 respostas são `301`; `GET /api/stats/<code>`
  mostra `totalClicks: 10` (sem perda por concorrência).

### `routes/urls.routes.ts` (TechSpec: `GET /api/urls`)

- **IT-015**: banco vazio — `GET /api/urls` — `200`, corpo `[]`. Link sem clique
  algum criado em seguida — reaparece na lista com `clickCount: 0`.
- **IT-016**: 3 links criados em sequência (clock avançando entre eles) e 2
  cliques no segundo link — `GET /api/urls` — `200`, array com 3 itens ordenados
  por `createdAt` decrescente, item do segundo link com `clickCount: 2`, demais
  com `clickCount: 0`.

### `routes/stats.routes.ts` (TechSpec: `GET /api/stats/:code`)

- **IT-017**: `GET /api/stats/codigoinexistente` — `404`,
  `error.code: 'LINK_NOT_FOUND'`.
- **IT-018**: link com cliques semeados em dias e referrers variados — `GET /api/stats/<code>`
  — `200`, `totalClicks` igual à soma dos cliques semeados, `clicksByDay` com 30
  itens, `topReferrers` ordenado decrescente com `null` agrupado sob `'direto'`.
- **IT-019**: link sem nenhum clique — `GET /api/stats/<code>` — `200`,
  `totalClicks: 0`, `clicksByDay` com os 30 itens em `count: 0`,
  `topReferrers: []`.

### `routes/analytics.routes.ts` (TechSpec: `GET /analytics/:code`)

- **IT-020**: link com cliques — `GET /analytics/<code>` — `200`,
  `content-type` contém `text/html`, corpo contém o valor de `totalClicks` e o
  nome de ao menos um referrer.
- **IT-021**: `GET /analytics/codigoinexistente` — `404`, `content-type` contém
  `text/html` (página de erro, não JSON).

## End-to-End Tests

### Jornada completa de criação, cliques e consulta (US-001, US-004, US-007, US-008)

- **E2E-001**: `POST /api/shorten` cria um link → 3 `GET /<code>` com referrers
  distintos (`https://a.com`, `https://b.com`, sem referrer) → `GET /api/urls`
  mostra o link com `clickCount: 3` → `GET /api/stats/<code>` mostra
  `totalClicks: 3` e `topReferrers` com as 3 origens corretas (incluindo
  `'direto'` para o clique sem referrer).

### Link expirado nunca contabiliza clique (US-002, US-006)

- **E2E-002**: `POST /api/shorten` com `expiresAt` no passado → `GET /<code>`
  retorna `410` → `GET /api/stats/<code>` mostra `totalClicks: 0`.

### Página de analytics reflete os cliques reais (US-001, US-004, US-009)

- **E2E-003**: `POST /api/shorten` cria um link → `GET /<code>` (com
  `Referer: https://google.com`) → `GET /analytics/<code>` — `200 text/html`
  contendo `totalClicks: 1` e `'https://google.com'` (ou seu rótulo agregado).
