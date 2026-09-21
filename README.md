# URL Shortener

Serviço de encurtamento de URLs com tracking de cliques e página de analytics.

## Requisitos

| Endpoint | Descrição |
| --- | --- |
| `POST /api/shorten` | Recebe `{ url, expiresAt? }` e devolve `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt }`. `400` para URL inválida (apenas `http`/`https`). |
| `GET /:code` | Redireciona (301) para a URL original. `404` se não existe, `410` se expirou. Registra o clique com `referrer`, `user-agent`, `ip` e timestamp. |
| `GET /api/urls` | Lista os links criados (mais recentes primeiro) com contagem de cliques. |
| `GET /api/stats/:code` | `totalClicks`, `clicksByDay` (últimos 30 dias) e `topReferrers`. |
| `GET /analytics/:code` | Página visual com total de cliques, cliques por dia e top referrers. |

Regras de negócio:

- Short code com ~7 caracteres alfanuméricos.
- `expiresAt` é opcional; quando presente, o redirect respeita a expiração.
- Validação de URL: somente `http://` e `https://`.

## Setup

Pré-requisito: Node.js >= 18.

```bash
# 1. instalar dependências
npm install

# 2. copiar o .env de exemplo (opcional — há defaults sensatos para dev)
cp .env.example .env

# 3. rodar em desenvolvimento (reload automático)
npm run dev

# 4. build de produção + start
npm run build
npm start

# testes e lint
npm test
npm run lint
```

Variáveis de ambiente (lidas e validadas em um único ponto: `src/config/env.ts`,
ver `.env.example`):

| Variável | Default | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do servidor. |
| `BASE_URL` | `http://localhost:3000` | Base usada para montar o `shortUrl` retornado. |
| `DATABASE_URL` | `file:./data/url-shortener.sqlite` | Path do arquivo SQLite (aceita `:memory:`, usado pelos testes). |

## Stack e decisões

Node.js + TypeScript + Fastify + `better-sqlite3` + Vitest — justificativa completa em
[ADR-001](.compozy/tasks/url-shortener/adrs/adr-001.md). Resumo: zero fricção de setup
(sem serviço externo/Docker), `better-sqlite3` é síncrono (testes determinísticos sem
mock de I/O) e SQLite resolve as agregações de analytics (`clicksByDay`, `topReferrers`)
com `GROUP BY` nativo. A geração do short code segue [ADR-002](.compozy/tasks/url-shortener/adrs/adr-002.md)
(código aleatório de 7 caracteres, sem dedupe de URL).

Este repositório está, neste momento, no estágio de **scaffold**: estrutura de pastas,
tooling (TypeScript strict, ESLint, Vitest), conexão e schema do banco, e o servidor
Fastify montável via `buildApp()` (testável com `app.inject()`, sem subir porta). Os
endpoints de negócio (`POST /api/shorten`, `GET /:code`, `GET /api/urls`,
`GET /api/stats/:code`, `GET /analytics/:code`) descritos na tabela acima ainda não
estão implementados — ficam para a tarefa seguinte, após o TechSpec fechar os detalhes
de arquitetura.

## Convenções do projeto

As regras obrigatórias de testes, code smells, Definition of Done e tratamento de
credenciais estão em [`CLAUDE.md`](./CLAUDE.md).
