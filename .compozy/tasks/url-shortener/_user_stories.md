# User Stories: URL Shortener

Catálogo canônico de comportamento do URL Shortener. Companion de `_prd.md`; consumido
por `_techspec.md` (mapeamento de componentes) e `_tests.md` (matriz de cobertura).

## Personas

- **Criador de link** — pessoa (dev, marketer, qualquer usuário da API) que encurta
  uma URL, compartilha o link curto e quer acompanhar quantos cliques recebeu.
- **Visitante** — pessoa que clica no link curto e é redirecionada; não interage
  diretamente com a API além do `GET /:code`, mas suas ações (clique, referrer,
  user-agent, IP) são o dado que alimenta o analytics do Criador de link.

## Story Index

| ID     | Feature Area      | Persona         | Story                                             |
|--------|--------------------|-----------------|----------------------------------------------------|
| US-001 | Criação de link     | Criador de link | Encurtar uma URL válida                            |
| US-002 | Criação de link     | Criador de link | Encurtar URL com data de expiração                 |
| US-003 | Criação de link     | Criador de link | Rejeitar URL inválida                              |
| US-004 | Redirecionamento    | Visitante       | Ser redirecionado ao acessar um short code válido  |
| US-005 | Redirecionamento    | Visitante       | Receber 404 para short code inexistente            |
| US-006 | Redirecionamento    | Visitante       | Receber 410 para short code expirado               |
| US-007 | Listagem            | Criador de link | Listar todos os links criados com contagem         |
| US-008 | Estatísticas        | Criador de link | Consultar estatísticas agregadas de um link        |
| US-009 | Analytics visual    | Criador de link | Ver página visual de analytics de um link          |

## Criação de link

### US-001: Encurtar uma URL válida

**Como** Criador de link, **quero** enviar uma URL para a API, **para que** eu
receba um link curto para compartilhar.

Acceptance criteria:

- AC-1: Dado um `POST /api/shorten` com `{ "url": "https://example.com/pagina" }`,
  quando processado, então a resposta é `201` com
  `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt: null }`, onde
  `shortCode` tem 7 caracteres alfanuméricos.
- AC-2: Duas chamadas com a mesma `url` geram dois registros com `shortCode`
  diferentes (sem dedupe — ver ADR-002).
- AC-3: `shortCode` gerado nunca colide com um já existente (retry na geração).

Edge cases:

- EC-1: URL com query string e fragmento (`?a=1#b`) → aceita e preservada
  exatamente como enviada em `originalUrl`.
- EC-2: URL extremamente longa (milhares de caracteres) → aceita (sem limite de
  tamanho artificial imposto, exceto o que o `body-parser`/framework limitar por
  padrão).
- EC-3: Corpo da requisição sem o campo `url` → `400`.
- EC-4: Corpo da requisição não é JSON válido → `400`.

### US-002: Encurtar URL com data de expiração

**Como** Criador de link, **quero** definir uma expiração opcional, **para que**
o link pare de funcionar depois de uma data.

Acceptance criteria:

- AC-1: Dado `{ "url": "https://example.com", "expiresAt": "2026-12-31T00:00:00Z" }`,
  quando processado, então a resposta inclui `expiresAt` igual ao valor enviado
  (normalizado em ISO 8601).
- AC-2: Sem `expiresAt` no corpo, o campo retorna `null` e o link nunca expira.

Edge cases:

- EC-1: `expiresAt` no passado (já expirado no momento da criação) → aceito na
  criação (`201`); o link nasce expirado e o próximo `GET /:code` retorna `410`
  (ver US-006). A criação em si não é validada contra "data no passado" — não é
  regra pedida no gist.
- EC-2: `expiresAt` com formato de data inválido (não parseável) → `400`.
- EC-3: `expiresAt` com timezone diferente de UTC → aceito, normalizado para UTC
  na resposta e na comparação de expiração.

### US-003: Rejeitar URL inválida

**Como** Criador de link, **quero** receber um erro claro ao enviar uma URL
inválida, **para que** eu corrija a entrada antes de tentar de novo.

Acceptance criteria:

- AC-1: `url` com protocolo diferente de `http`/`https` (ex.: `ftp://`,
  `javascript:`, `mailto:`) → `400` com corpo de erro descritivo.
- AC-2: `url` que não é uma URL bem formada (string arbitrária, ex.: `"não é url"`)
  → `400`.

Edge cases:

- EC-1: `url` vazia (`""`) → `400`.
- EC-2: `url` sem protocolo (`"example.com"`) → `400` (protocolo é obrigatório e
  restrito a http/https, não há resolução implícita de esquema).
- EC-3: `url` com protocolo em maiúsculas (`HTTPS://example.com`) → aceita
  (validação de protocolo é case-insensitive).

## Redirecionamento

### US-004: Ser redirecionado ao acessar um short code válido

**Como** Visitante, **quero** ser levado à URL original ao acessar o link curto,
**para que** eu chegue ao conteúdo pretendido.

Acceptance criteria:

- AC-1: `GET /:code` para um código existente e não expirado → `301` com header
  `Location` igual à `originalUrl`.
- AC-2: O acesso registra um clique com `referrer` (header `Referer`, pode ser
  ausente), `user-agent`, `ip` do requisitante e timestamp do momento do acesso.

Edge cases:

- EC-1: Requisição sem header `Referer` → clique registrado com `referrer: null`.
- EC-2: Requisição sem header `User-Agent` → clique registrado com
  `userAgent: null`.
- EC-3: Dois cliques simultâneos no mesmo código → ambos redirecionam e ambos são
  contabilizados (sem perda por concorrência).
- EC-4: 100 cliques no mesmo código → todos contabilizados; `GET /api/stats/:code`
  reflete o total correto.

### US-005: Receber 404 para short code inexistente

**Como** Visitante, **quero** um erro claro ao acessar um código que não existe,
**para que** eu saiba que o link está incorreto.

Acceptance criteria:

- AC-1: `GET /:code` para código nunca criado → `404`, sem registrar clique (não há
  link a que associar o clique).

Edge cases:

- EC-1: Código com caracteres fora do alfabeto esperado (ex.: espaço, `/`,
  caracteres unicode) → `404` (tratado como "não encontrado", não como erro de
  validação de formato).

### US-006: Receber 410 para short code expirado

**Como** Visitante, **quero** saber que um link expirou, **para que** eu entenda
por que não fui redirecionado.

Acceptance criteria:

- AC-1: `GET /:code` para um código cujo `expiresAt` já passou (comparado ao
  momento da requisição) → `410`, sem redirecionar.
- AC-2: O acesso a um código expirado **não** conta como clique válido de
  redirecionamento — não é somado a `totalClicks`/`clicksByDay` (é uma tentativa
  falha, não um redirecionamento entregue).

Edge cases:

- EC-1: Código expira exatamente no instante da requisição (`expiresAt === now`)
  → tratado como expirado (`410`); o limite é inclusivo.
- EC-2: Código sem `expiresAt` (nunca expira) → nunca retorna `410` por esse
  motivo.

## Listagem

### US-007: Listar todos os links criados com contagem

**Como** Criador de link, **quero** ver todos os links que criei, **para que** eu
tenha uma visão geral do que já compartilhei.

Acceptance criteria:

- AC-1: `GET /api/urls` → `200` com array de links, cada um contendo pelo menos
  `shortCode`, `shortUrl`, `originalUrl`, `createdAt`, `expiresAt` e `clickCount`.
- AC-2: Ordenação por `createdAt` decrescente (mais recente primeiro).
- AC-3: `clickCount` reflete o total de cliques válidos (redirecionamentos
  entregues) registrados para aquele código.

Edge cases:

- EC-1: Nenhum link criado ainda → `200` com array vazio `[]`.
- EC-2: Link sem nenhum clique → `clickCount: 0`.
- EC-3: Volume alto de links (centenas) → lista completa retornada (sem paginação
  — não pedida no gist; ver Non-Goals no PRD).

## Estatísticas

### US-008: Consultar estatísticas agregadas de um link

**Como** Criador de link, **quero** ver dados agregados de cliques, **para que**
eu entenda o desempenho do link.

Acceptance criteria:

- AC-1: `GET /api/stats/:code` → `200` com `{ totalClicks, clicksByDay,
  topReferrers }`.
- AC-2: `clicksByDay` cobre os últimos 30 dias (a partir de hoje), um item por dia
  (incluindo dias com zero cliques), com data e contagem.
- AC-3: `topReferrers` lista os referrers mais frequentes com sua contagem,
  ordenados decrescente.

Edge cases:

- EC-1: Código existe mas nunca recebeu clique → `totalClicks: 0`,
  `clicksByDay` com 30 dias todos zerados, `topReferrers: []`.
- EC-2: Código inexistente → `404`.
- EC-3: Cliques sem `referrer` (nulo) → agrupados sob uma categoria explícita
  (`"direto"`/`null`), não descartados nem misturados com um referrer real.
- EC-4: Mais de 30 dias de histórico de cliques → apenas os últimos 30 dias
  entram em `clicksByDay` (cliques mais antigos continuam somados em
  `totalClicks`).

## Analytics visual

### US-009: Ver página visual de analytics de um link

**Como** Criador de link, **quero** uma página web com os dados de analytics,
**para que** eu possa compartilhar um link de resultados com quem pediu o link
curto, sem precisar consumir a API diretamente.

Acceptance criteria:

- AC-1: `GET /analytics/:code` → página HTML mostrando `totalClicks`, cliques por
  dia (gráfico ou tabela) e top referrers.
- AC-2: A página é acessível diretamente pelo navegador (sem autenticação —
  ver Non-Goals no PRD) e reutiliza os mesmos dados de `GET /api/stats/:code`.

Edge cases:

- EC-1: Código inexistente → página de erro clara (404), não uma página de
  analytics vazia disfarçada de válida.
- EC-2: Código sem nenhum clique → página renderiza normalmente com estado
  "zero cliques" (não é erro).
- EC-3: Código expirado → página de analytics continua acessível (analytics é
  histórico; expiração afeta o redirect, não a consulta de dados).
