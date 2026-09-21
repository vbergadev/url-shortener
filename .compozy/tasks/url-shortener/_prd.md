# PRD: URL Shortener

## Overview

Serviço de encurtamento de URLs: recebe uma URL longa e devolve um link curto
(~7 caracteres) que redireciona para o destino original. Cada acesso ao link curto
é rastreado (referrer, user-agent, IP, timestamp), e quem criou o link pode consultar
uma página de analytics visual com o total de cliques, a evolução diária e as
principais origens de tráfego — dado suficiente para compartilhar um "relatório" do
link com quem pediu para encurtá-lo, sem dar acesso à API.

Construído como desafio de entrevista técnica (live coding, 1h, uso de AI incentivado),
mas o produto em si resolve um problema real: dar visibilidade de uso a quem
compartilha links, com uma expiração opcional para links temporários.

## Goals

- Qualquer pessoa pode transformar uma URL http/https em um link curto de 7
  caracteres, imediatamente utilizável.
- Um link pode ter uma data de expiração opcional; passada essa data, o link para
  de redirecionar e informa isso explicitamente (não falha silenciosamente).
- Quem criou um link pode ver, sem precisar consultar a API diretamente, quantos
  cliques ele recebeu, como esses cliques se distribuem ao longo do tempo e de
  onde vieram (referrer).
- Quem criou vários links pode ver todos eles de uma vez, com a contagem de
  cliques de cada um, sem precisar consultar cada um individualmente.
- URLs inválidas (protocolo não suportado ou malformadas) nunca chegam a gerar um
  link curto — o erro acontece na criação, não no clique.

## User Stories

Ver catálogo completo: [_user_stories.md](_user_stories.md)

- US-001 a US-003 — Criação de link: encurtar URL válida, com expiração opcional,
  e rejeição de URL inválida.
- US-004 a US-006 — Redirecionamento: redirect bem-sucedido com tracking de
  clique, 404 para inexistente, 410 para expirado.
- US-007 — Listagem de todos os links com contagem de cliques.
- US-008 — Estatísticas agregadas de um link (total, por dia, top referrers).
- US-009 — Página visual de analytics.

## Core Features

- **Encurtamento de URL**: recebe uma URL (e opcionalmente uma data de expiração),
  valida, gera um código curto único de 7 caracteres alfanuméricos e devolve o
  link pronto para uso. É o ponto de entrada de todo o resto do produto — sem um
  link criado, não há o que redirecionar nem o que medir.
- **Redirecionamento com tracking**: acessar o link curto redireciona (301) para
  a URL original e registra um evento de clique com os metadados da requisição.
  É o comportamento central do produto do ponto de vista de quem recebe o link —
  e a fonte de todo dado de analytics.
- **Listagem de links**: visão consolidada de todos os links já criados, com
  contagem de cliques, para quem gerencia vários links de uma vez.
- **Estatísticas agregadas**: cálculo, por link, do total de cliques, distribuição
  por dia nos últimos 30 dias e as origens (referrers) mais frequentes. Alimenta
  tanto uma consulta programática (API) quanto a página visual.
- **Página de analytics**: interface visual, acessível por link direto no
  navegador, que apresenta os dados de estatísticas de forma legível para quem
  não vai consumir a API — o formato pensado para ser compartilhado com quem
  pediu o link curto.

Interação entre features: encurtamento é pré-requisito de tudo; redirecionamento
é a única fonte de dados de clique; listagem e estatísticas apenas leem o que o
redirecionamento gravou; a página de analytics é uma camada visual sobre as
mesmas estatísticas expostas pela API.

## Business Rules

- Um link tem exatamente um `shortCode`, único, de 7 caracteres alfanuméricos
  (`[A-Za-z0-9]`), gerado aleatoriamente pelo sistema no momento da criação
  (ver ADR-002). Não há suporte a código customizado escolhido pelo usuário.
- `url` é obrigatória e válida somente com protocolo `http://` ou `https://`
  (case-insensitive); qualquer outro protocolo ou string não parseável como URL
  é rejeitada com `400` na criação.
- `expiresAt` é opcional. Quando ausente, o link nunca expira. Quando presente,
  é comparado ao instante da requisição em cada `GET /:code`; no limite exato
  (`expiresAt == now`) o link é considerado expirado.
- Um link expirado nunca é validado retroativamente — a validação de expiração
  não bloqueia a criação (mesmo um `expiresAt` no passado é aceito e o link já
  nasce expirado).
- Cada chamada a `POST /api/shorten` cria um novo registro e um novo `shortCode`,
  mesmo que a `url` seja idêntica a uma já encurtada antes — não há
  deduplicação (ver ADR-002).
- Um "clique" só é contabilizado em analytics/contagem quando o redirecionamento
  é efetivamente entregue (`301`). Uma tentativa de acesso a um código expirado
  (`410`) ou inexistente (`404`) não é contabilizada como clique.
- Todo clique válido registra: `referrer` (pode ser nulo), `user-agent` (pode ser
  nulo), `ip` do requisitante e timestamp do momento do acesso.
- `clicksByDay` sempre cobre exatamente os últimos 30 dias a partir de hoje,
  incluindo dias sem clique (contagem zero) — nunca uma lista parcial.
- `topReferrers` agrupa por valor de referrer, incluindo uma categoria explícita
  para ausência de referrer (tráfego direto), nunca descarta o dado.
- Não há autenticação nem propriedade de link por usuário: qualquer um com o
  `shortCode` acessa `/api/stats/:code` e `/analytics/:code` (ver Non-Goals).

## User Experience

Personas: **Criador de link** (quem encurta e quer visibilidade dos cliques) e
**Visitante** (quem clica no link curto e é redirecionado; não interage
diretamente com a API, mas gera os dados de analytics).

Fluxo primário do Criador de link:

1. Envia uma URL (com ou sem expiração) via `POST /api/shorten`.
2. Recebe o `shortUrl` pronto para compartilhar.
3. Compartilha o link.
4. Quando quiser, acessa `GET /api/urls` para ver todos os seus links, ou
   `GET /analytics/:code` (no navegador) para ver o desempenho de um específico.

Fluxo primário do Visitante:

1. Recebe/clica no link curto.
2. É redirecionado (301) para o destino original, sem perceber a camada de
   tracking.
3. Se o link expirou, vê uma resposta `410` em vez de ser redirecionado.

UI/UX da página de analytics: interface simples, sem necessidade de login,
legível tanto em desktop quanto mobile, priorizando clareza dos números
(total de cliques em destaque, tabela ou gráfico simples de cliques por dia,
lista de top referrers) sobre sofisticação visual — o objetivo é ser um
"relatório compartilhável", não um dashboard interativo.

## High-Level Technical Constraints

- Sem integração obrigatória com sistema externo.
- Sem requisito de compliance regulatório declarado (produto de escopo de
  desafio técnico, não produção real).
- Sem meta de performance formal; deve responder de forma interativa (sub-segundo)
  no volume de uso de uma demonstração/desenvolvimento local.
- Dado de IP e user-agent do visitante é armazenado sem anonimização — aceitável
  neste escopo (ver Non-Goals); não é um requisito de privacidade/LGPD tratado
  por este PRD.

## Non-Goals (Out of Scope)

- **Autenticação e multiusuário**: não há login, não há "dono" de um link
  restringindo quem pode consultar `/api/stats/:code` ou `/analytics/:code`.
  Qualquer um com o código acessa. Decisão de escopo: não pedido no gist e
  fora do orçamento de 1h.
- **Deduplicação de URL**: a mesma URL encurtada duas vezes gera dois links
  distintos (ver ADR-002 e Business Rules).
- **Short code customizado**: usuário não pode escolher o próprio código.
- **Paginação em `GET /api/urls`**: lista sempre completa. Fora de escopo para
  o volume esperado de uma demonstração.
- **Anonimização/retenção de dados de clique (LGPD/GDPR)**: IP e user-agent são
  guardados como recebidos, sem política de expurgo. Um produto real precisaria
  tratar isso; está fora do escopo deste desafio.
- **Rate limiting / proteção contra abuso**: não há limite de criação de links
  nem de acessos.
- **Encurtamento em lote (bulk)**: apenas um link por chamada a
  `POST /api/shorten`.

## Architecture Decision Records

- [ADR-001: Stack — Node.js + TypeScript + Fastify + better-sqlite3 + Vitest](adrs/adr-001.md) — escolha de stack priorizando zero fricção de setup e persistência real com agregação via SQL.
- [ADR-002: Geração de short code — aleatório com retry em colisão, sem dedupe de URL](adrs/adr-002.md) — código aleatório não-enumerável; cada criação gera um novo registro, mesmo para URL repetida.

## Open Questions

Nenhuma pendência bloqueante identificada para o escopo do desafio. Decisões que
teriam gerado pergunta em um cenário sem restrição de tempo foram resolvidas
unilateralmente e registradas acima (Business Rules, Non-Goals, ADRs), a pedido
explícito do usuário de priorizar velocidade sobre uma rodada de esclarecimento.
Se algum desses pontos não refletir a intenção real, é mais rápido corrigir direto
no PRD/ADR do que reabrir a pergunta agora.
