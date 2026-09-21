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

_A ser preenchido junto com a escolha da stack._

## Stack e decisões

_A ser preenchido: justificativa de runtime, framework, persistência e ferramenta de teste._

## Convenções do projeto

As regras obrigatórias de testes, code smells, Definition of Done e tratamento de
credenciais estão em [`CLAUDE.md`](./CLAUDE.md).
