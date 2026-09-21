# TechSpec: URL Shortener

Companion de `_prd.md` e `_user_stories.md`. Decisões de produto já estão resolvidas
lá; este documento resolve **como** implementar — camadas, esquema de dados, contrato
exato de cada endpoint e estratégia de teste — para que a implementação (via
`cy-create-tasks`) não precise tomar nenhuma decisão de arquitetura por conta própria.

Gerado em modo rápido (desafio de 1h, sem rodada de perguntas ao usuário — pedido
explícito de priorizar velocidade). Decisões que teriam virado pergunta técnica foram
resolvidas unilateralmente e documentadas como ADR-003 e ADR-004.

## Executive Summary

Fastify + `better-sqlite3` + TypeScript (ADR-001), organizados em três camadas com
sentido único de dependência — `routes` (HTTP) → `services` (regra de negócio) →
`repositories` (SQL) — para isolar a lógica de negócio do framework HTTP e do driver
de banco (ADR-003, code smell crítico #6 do `CLAUDE.md`). Tempo e geração de short
code são dependências injetáveis (`Clock`, `CodeGenerator`), permitindo que toda a
suíte de testes seja determinística sem tocar relógio real nem `Math.random`
(regra 1.3 do `CLAUDE.md`). Persistência em duas tabelas (`links`, `clicks`);
`clicksByDay` é resolvido inteiramente em SQL via CTE recursiva que zero-preenche os
30 dias (ADR-004), sem loop de agregação em JavaScript. A página `/analytics/:code` é
HTML server-rendered sem framework de frontend (ADR-001), gerada por uma função pura
que recebe o mesmo objeto de estatísticas devolvido por `GET /api/stats/:code`.

Trade-off principal: mais arquivos/camadas do que uma solução "tudo no handler"
exigiria, em troca de regra de negócio 100% testável sem subir Fastify nem SQLite —
trade-off que o próprio `CLAUDE.md` torna obrigatório, não opcional.

## System Architecture

### Component Overview

```
Request HTTP
   │
   ▼
routes/*  ──────────────► valida request (JSON Schema Fastify), chama service,
                           mapeia erro tipado → status HTTP
   │
   ▼
services/*  ────────────► regra de negócio (validação de URL/expiração, geração
                           de short code com retry, cálculo de expiração, montagem
                           de stats). Não conhece Fastify nem SQL.
   │
   ▼
repositories/*  ────────► único lugar que importa better-sqlite3 e escreve SQL
   │
   ▼
db/connection.ts  ──────► conexão better-sqlite3 (arquivo ou :memory:)
```

Dependências transversais (`lib/clock.ts`, `lib/code-generator.ts`) são construídas
uma vez em `buildApp(deps)` e passadas explicitamente para os services que precisam
(ver ADR-003). `views/analytics-page.ts` é uma função pura `(stats) => string` chamada
apenas pela rota `GET /analytics/:code` — não depende de repository nem de service
além de reutilizar `stats-service`.

Nenhuma integração com sistema externo (seção "Integration Points" omitida — PRD não
exige nenhuma).

## Implementation Design

### Core Interfaces

```ts
// lib/clock.ts
export interface Clock { now(): Date }

// lib/code-generator.ts
export interface CodeGenerator { generate(): string } // 7 chars [A-Za-z0-9]

// domain/types.ts
export interface Link {
  id: number
  shortCode: string
  originalUrl: string
  createdAt: string   // ISO 8601 UTC
  expiresAt: string | null
}

export interface Click {
  id: number
  linkId: number
  referrer: string | null
  userAgent: string | null
  ip: string
  createdAt: string   // ISO 8601 UTC
}

export interface LinkStats {
  totalClicks: number
  clicksByDay: { date: string; count: number }[]   // sempre 30 itens
  topReferrers: { referrer: string; count: number }[] // "direto" p/ null
}
```

```ts
// services/shorten-service.ts
export interface ShortenInput { url: string; expiresAt?: string }
export interface ShortenService {
  createLink(input: ShortenInput): Link
  // lança InvalidUrlError | InvalidExpiresAtError | CodeGenerationExhaustedError
}

// services/redirect-service.ts
export interface RedirectMeta { referrer: string | null; userAgent: string | null; ip: string }
export interface RedirectService {
  resolve(code: string, meta: RedirectMeta): { originalUrl: string }
  // lança LinkNotFoundError | LinkExpiredError; registra o clique só no caminho feliz
}
```

Erros de domínio (`errors/app-errors.ts`) compartilham uma base tipada com `code` e
`statusCode`, mapeada 1:1 para a resposta HTTP pelo error handler global do Fastify —
nunca um `throw new Error("...")` cru (code smell crítico #16 do `CLAUDE.md`):

```ts
export abstract class AppError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number
}
export class InvalidUrlError extends AppError { code = 'INVALID_URL'; statusCode = 400 }
export class InvalidExpiresAtError extends AppError { code = 'INVALID_EXPIRES_AT'; statusCode = 400 }
export class LinkNotFoundError extends AppError { code = 'LINK_NOT_FOUND'; statusCode = 404 }
export class LinkExpiredError extends AppError { code = 'LINK_EXPIRED'; statusCode = 410 }
export class CodeGenerationExhaustedError extends AppError { code = 'CODE_GENERATION_EXHAUSTED'; statusCode = 500 }
```

### Data Models

**Esquema SQLite** (ver ADR-004 para o raciocínio de timestamps como `TEXT` ISO 8601
UTC e agregação via CTE recursiva):

```sql
CREATE TABLE IF NOT EXISTS links (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code   TEXT NOT NULL,
  original_url TEXT NOT NULL,
  created_at   TEXT NOT NULL,   -- ISO 8601 UTC
  expires_at   TEXT             -- ISO 8601 UTC, NULL = nunca expira
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);

CREATE TABLE IF NOT EXISTS clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id    INTEGER NOT NULL REFERENCES links (id),
  referrer   TEXT,              -- NULL = tráfego direto
  user_agent TEXT,              -- NULL = ausente no request
  ip         TEXT NOT NULL,
  created_at TEXT NOT NULL      -- ISO 8601 UTC
);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id    ON clicks (link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON clicks (created_at);
```

- `idx_links_short_code` (único): garante unicidade no banco além do retry em
  aplicação (ADR-002) — uma colisão nunca é persistida silenciosamente.
- `idx_clicks_link_id`: usado por toda query de agregação (`WHERE link_id = ?`).
- `idx_clicks_created_at`: usado pelo `LEFT JOIN` de `clicksByDay` (`date(created_at)`).

**Query `totalClicks`:**

```sql
SELECT COUNT(*) AS total FROM clicks WHERE link_id = :linkId;
```

**Query `clicksByDay`** (últimos 30 dias, zero-preenchidos; `:today` = `clock.now()`
formatado `YYYY-MM-DD` em código, nunca `date('now')` do SQLite — ver ADR-004):

```sql
WITH RECURSIVE day_offsets(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM day_offsets WHERE n < 29
),
days(day) AS (
  SELECT date(:today, '-' || n || ' days') FROM day_offsets
)
SELECT
  days.day AS date,
  COUNT(clicks.id) AS count
FROM days
LEFT JOIN clicks
  ON date(clicks.created_at) = days.day
  AND clicks.link_id = :linkId
GROUP BY days.day
ORDER BY days.day ASC;
```

Retorna exatamente 30 linhas, da mais antiga (`today - 29`) até `today`, com
`count = 0` nos dias sem clique.

**Query `topReferrers`** (agrupa `NULL` sob `"direto"`, nunca descarta):

```sql
SELECT
  COALESCE(referrer, 'direto') AS referrer,
  COUNT(*) AS count
FROM clicks
WHERE link_id = :linkId
GROUP BY COALESCE(referrer, 'direto')
ORDER BY count DESC;
```

Todas as três queries usam parâmetros nomeados do `better-sqlite3`
(`.all({ linkId, today })`) — nunca concatenação de string com valor externo (code
smell crítico #21).

### API Endpoints

Toda resposta de erro (400/404/410/500) usa o mesmo formato de corpo:

```json
{ "error": { "code": "LINK_NOT_FOUND", "message": "short code 'abc123X' não encontrado" } }
```

`code` é um dos valores de `errors/app-errors.ts`, mais `VALIDATION_ERROR` (falha de
JSON Schema do Fastify, ex.: campo `url` ausente ou body não é JSON válido) e
`INTERNAL_ERROR` (fallback do error handler global — nunca vaza stack trace nem
detalhe de infraestrutura no corpo, apenas logado no servidor).

---

**`POST /api/shorten`**

- Request body (JSON Schema Fastify): `{ url: string (required), expiresAt?: string }`.
- `201`: `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt }` —
  `shortUrl = ${BASE_URL}/${shortCode}`.
- `400 INVALID_URL`: `url` sem protocolo `http(s)` ou não parseável.
- `400 INVALID_EXPIRES_AT`: `expiresAt` presente e não parseável como data.
- `400 VALIDATION_ERROR`: `url` ausente do body, ou body não é JSON válido.
- `expiresAt` no passado é aceito (`201`) — a criação não valida "data futura"
  (Business Rules do PRD).

---

**`GET /:code`**

- Params: `code` (string, sem schema de formato — qualquer valor cai em lookup;
  não encontrado é sempre `404`, mesmo com caracteres fora do alfabeto esperado).
- `301`: header `Location: <originalUrl>`; registra clique com `referrer` (header
  `Referer`, `null` se ausente), `userAgent` (header `User-Agent`, `null` se
  ausente), `ip` (`request.ip` do Fastify) e `createdAt = clock.now()`.
- `404 LINK_NOT_FOUND`: código não existe. Não registra clique.
- `410 LINK_EXPIRED`: `expiresAt <= clock.now()` (limite inclusivo). Não registra
  clique.

---

**`GET /api/urls`**

- `200`: array de `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt, clickCount }`,
  ordenado por `createdAt` decrescente. `[]` quando não há links.

---

**`GET /api/stats/:code`**

- `200`: `{ totalClicks, clicksByDay, topReferrers }` (formatos acima).
- `404 LINK_NOT_FOUND`: código não existe.
- Link expirado não é erro aqui — stats de link expirado continuam acessíveis
  (histórico; expiração só afeta o redirect).

---

**`GET /analytics/:code`**

- `200 text/html`: página renderizada por `views/analytics-page.ts` com os mesmos
  dados de `GET /api/stats/:code` — total em destaque, barras CSS por dia (30
  colunas), lista de top referrers. Zero cliques renderiza estado "0 cliques", não
  um erro.
- `404 text/html`: página de erro simples (não JSON) quando o código não existe —
  é uma rota de navegador, então o contrato de erro aqui é HTML, diferente das
  rotas `/api/*`.

## Integration Points

Não aplicável — nenhuma integração com sistema externo (PRD não exige).

## Impact Analysis

Projeto novo (scaffold inicial, sem código pré-existente). Tabela abaixo lista os
componentes que este TechSpec introduz, não "impacto" sobre um sistema já em produção.

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `db/migrations.ts` | new | Schema de `links`/`clicks`; risco baixo (roda em memória em teste) | Criar e rodar no boot e no setup de teste |
| `repositories/*` | new | Único ponto de SQL; risco de query incorreta em `clicksByDay` | Cobrir com testes de integração (IT) |
| `services/*` | new | Regra de negócio central | Cobrir com testes unitários (UT) por serviço |
| `routes/*` | new | Contrato HTTP público | Cobrir com testes de integração via `app.inject()` |
| `views/analytics-page.ts` | new | HTML server-rendered, sem build step | Cobrir com testes unitários de renderização |
| `lib/clock.ts`, `lib/code-generator.ts` | new | Habilitam determinismo em teste (ADR-003) | Fake equivalente em `test/helpers` |

## Testing Approach

- **Framework**: Vitest (ADR-001). Nenhum mock de módulo global (`vi.mock`) para
  tempo/aleatoriedade — sempre injeção via `Clock`/`CodeGenerator` (ADR-003).
- **Unit**: `lib/*` e `services/*`, com repositórios fake em memória (implementando
  a mesma interface dos repositories reais) e `Clock`/`CodeGenerator` fixos/fila
  controlada. Nenhum I/O real. Cobre toda regra de negócio e todo caminho de erro.
- **Integration**: `repositories/*` contra `better-sqlite3` real com `:memory:`
  (verifica SQL/índices de verdade, incluindo a CTE recursiva) e `routes/*` via
  `app.inject()` do Fastify sobre `buildApp()` com banco `:memory:` — nunca um
  servidor real escutando porta. `Clock`/`CodeGenerator` seguem injetados (fixos ou
  fake) mesmo em integração, para os testes de expiração/colisão permanecerem
  determinísticos.
- **End-to-End**: como o serviço é um único processo HTTP sem frontend com build
  próprio (ADR-001), "E2E" aqui significa encadear múltiplas chamadas via
  `app.inject()` reproduzindo uma jornada completa do PRD (criar → clicar → listar →
  consultar stats/analytics) na mesma instância de app — sem browser real, sem porta
  de rede real. Nenhum framework de E2E adicional é necessário.
- **Fixtures**: `test/helpers/build-test-app.ts` (monta `buildApp` com `:memory:` +
  fakes), `test/helpers/fake-clock.ts`, `test/helpers/fake-code-generator.ts`,
  `test/helpers/fake-repositories.ts` (para os testes unitários de services).
- Cada teste cria e destrói seu próprio banco `:memory:` (uma conexão por teste) —
  sem estado compartilhado entre testes, podem rodar em qualquer ordem/paralelo
  (regra 1.3 do `CLAUDE.md`).

## Development Sequencing

### Build Order

1. `config/env.ts` + `db/connection.ts` + `db/migrations.ts` — sem dependências.
2. `lib/clock.ts`, `lib/code-generator.ts`, `lib/url-validator.ts`,
   `lib/expires-at-parser.ts` — sem dependências.
3. `errors/app-errors.ts` — sem dependências.
4. `repositories/links-repository.ts`, `repositories/clicks-repository.ts` —
   depende de (1).
5. `services/shorten-service.ts`, `services/redirect-service.ts`,
   `services/urls-service.ts`, `services/stats-service.ts` — depende de (2), (3), (4).
6. `views/analytics-page.ts` — depende do formato de `LinkStats` (domain/types.ts).
7. `routes/*.ts` + `app.ts` (`buildApp`) — depende de (5), (6).
8. `server.ts` — depende de (7).

### Technical Dependencies

- Nenhuma dependência externa bloqueante (sem serviço de terceiros, sem
  infraestrutura além do processo Node local — ADR-001).
- `package.json`/`tsconfig`/scaffold inicial é responsabilidade de outra frente de
  trabalho em paralelo a este documento; a estrutura de pastas acima assume que o
  scaffold segue este layout.

## Monitoring and Observability

Fora do orçamento de 1h (não pedido pelo PRD). Nível mínimo aceitável:

- Log estruturado (`fastify.log`, nível `info`) de cada request via o logger nativo
  do Fastify — nunca logar `url`/corpo de request completo com dado sensível (não há
  segredo nesse domínio, mas IP/user-agent não devem ir em log além do já persistido
  no banco).
- Log de nível `error` no error handler global para `INTERNAL_ERROR` (erro não
  mapeado), sem stack trace na resposta HTTP.

## Technical Considerations

### Key Decisions

- **Decisão**: camadas `routes → services → repositories` com `Clock`/`CodeGenerator`
  injetáveis. **Racional**: isola regra de negócio de Fastify/SQL (code smell #6) e
  garante testes determinísticos (regra 1.3). **Trade-off**: mais arquivos que uma
  solução "tudo no handler". Ver ADR-003.
- **Decisão**: timestamps `TEXT` ISO 8601 UTC + `clicksByDay` via CTE recursiva.
  **Racional**: zero-fill de 30 dias sem loop em JS, aproveitando a agregação SQL que
  justifica o ADR-001. **Trade-off**: exige disciplina de sempre gravar UTC. Ver
  ADR-004.
- **Decisão**: colisão de short code tratada via `INSERT` + captura de violação da
  constraint `UNIQUE`, com retry (máx. 5 tentativas), em vez de `SELECT` de
  existência antes do `INSERT`. **Racional**: `better-sqlite3` é síncrono/single-
  threaded, então não há race condition entre "checar" e "inserir" dentro do mesmo
  processo; delegar a checagem para a constraint do banco evita uma query extra por
  criação e mantém uma única fonte de verdade de unicidade.
- **Decisão**: erro de `/analytics/:code` para código inexistente é HTML, erro de
  `/api/*` é sempre JSON. **Racional**: `/analytics/:code` é consumida por navegador
  (US-009), `/api/*` por cliente HTTP/JSON.

### Known Risks

- Colisão de short code esgotando as 5 tentativas de retry é teoricamente possível
  mas teria probabilidade desprezível mesmo em volume real (62^7 combinações);
  mitigado com `CodeGenerationExhaustedError` explícito em vez de loop infinito.
- CTE recursiva é uma construção SQL menos comum — mitigada por comentário no código
  apontando para ADR-004 e por cobertura de teste de integração direta na query
  (IT-004/IT-005 em `_tests.md`).

## Architecture Decision Records

- [ADR-001: Stack — Node.js + TypeScript + Fastify + better-sqlite3 + Vitest](adrs/adr-001.md) — escolha de stack.
- [ADR-002: Geração de short code — aleatório com retry em colisão, sem dedupe de URL](adrs/adr-002.md) — geração e unicidade de `shortCode`.
- [ADR-003: Arquitetura em camadas com dependências injetáveis (clock, gerador de código)](adrs/adr-003.md) — isolamento de infraestrutura e determinismo de teste.
- [ADR-004: Timestamps como TEXT ISO 8601 UTC e agregação de clicksByDay via CTE recursiva](adrs/adr-004.md) — modelo de dados temporal e query de agregação.
