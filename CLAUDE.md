# Regras do Projeto

Estas regras são **obrigatórias** e valem para todo código produzido neste repositório,
por humano ou por AI. Não são sugestões. Em caso de conflito com "ir mais rápido",
as regras vencem.

---

## 1. Testes unitários

### 1.1 Cobertura obrigatória
- **Todo código de produção deve ter teste unitário.** Nenhuma função, método, classe,
  handler, middleware ou módulo entra no repositório sem teste.
- Código sem teste não é considerado "pronto" — é considerado não escrito.

### 1.2 Qualidade do teste (isto importa mais que a cobertura)
O teste precisa **realmente testar o comportamento**, não apenas executar as linhas.

Um teste válido:
- Faz asserções sobre o **resultado observável** (retorno, estado, efeito colateral,
  exceção lançada), não sobre "não quebrou".
- Cobre o **caminho feliz + casos de borda + casos de erro**. Um único teste de caminho
  feliz não fecha um requisito.
- Falha se a implementação for quebrada. **Regra prática: se você apagar o corpo do
  método e o teste continuar passando, o teste é inútil e deve ser reescrito.**
- Testa a unidade, não o mock. Mocks existem pra isolar dependência externa
  (rede, relógio, IO, aleatoriedade) — não pra reimplementar a lógica sob teste.

**Proibido explicitamente:**
- Teste sem `expect`/`assert`.
- Teste que só verifica `toBeDefined()`, `not.toThrow()` ou `toHaveBeenCalled()` quando
  o que importa é o valor produzido.
- Teste escrito para "subir a cobertura" sem intenção de verificar comportamento.
- `it.skip` / `it.todo` / teste comentado deixado no repositório sem issue aberta.
- Snapshot como único mecanismo de asserção de lógica.

### 1.3 Testes não podem ser flaky
- **Determinismo é requisito.** O mesmo teste, rodado 100 vezes, dá o mesmo resultado.
- Nada de dependência de: relógio real (`Date.now()` sem fake timer), aleatoriedade sem
  seed, ordem de execução entre testes, estado compartilhado entre testes, `sleep`/
  `setTimeout` arbitrário para "esperar" algo, rede externa, porta fixa, timezone da
  máquina, ordenação não determinística de banco.
- Tempo, aleatoriedade e IDs devem ser **injetados** (clock/idGenerator) para serem
  controláveis no teste.
- Cada teste monta e destrói seu próprio estado. Testes devem passar em qualquer ordem
  e em paralelo.
- **Teste flaky é bug de prioridade alta.** Não se dá retry, não se marca como skip:
  conserta-se a causa.

---

## 2. Code smells — CRÍTICOS, bloqueiam a entrega

Os itens abaixo são tratados como **defeito crítico**. Não passam em review, não são
deixados "pra depois", não recebem `// TODO`. Se um for encontrado, é corrigido antes
de a tarefa ser considerada concluída.

### Design e estrutura
1. **God object / God function** — classe ou função que acumula responsabilidades
   não relacionadas.
2. **Função longa** — se não cabe na cabeça de uma vez, é longa demais. Extrair.
3. **Lista de parâmetros longa** — muitos parâmetros posicionais; usar objeto/tipo.
4. **Violação de responsabilidade única (SRP)** — um motivo para mudar, só um.
5. **Feature envy** — código que mexe mais nos dados de outro objeto do que nos seus.
6. **Acoplamento com detalhe de infraestrutura** — regra de negócio importando driver
   de banco, framework HTTP ou SDK direto. Isolar atrás de interface/porta.
7. **Abstração prematura** — camada/genérico criado "para o futuro" sem caso de uso real.

### Duplicação e clareza
8. **Código duplicado** — lógica repetida em mais de um lugar.
9. **Magic numbers / magic strings** — valores literais sem constante nomeada.
10. **Nome ruim ou enganoso** — `data`, `temp`, `handle`, `x`, ou nome que não descreve
    o que a coisa faz. Nome mentiroso é pior que nome vago.
11. **Comentário que explica código confuso** — reescreva o código em vez de comentar.
12. **Código morto / comentado** — apagar. O git guarda o histórico.
13. **Complexidade ciclomática alta** — ninhos profundos de `if`/`for`. Usar early return,
    guard clause, decomposição.
14. **Flag boolean como parâmetro** que faz a função ter dois comportamentos distintos.

### Correção e segurança
15. **Erro engolido** — `catch` vazio, `catch` que só loga e segue, `catch (e) {}`.
16. **Erro genérico** — lançar/capturar `Error` cru onde cabe erro tipado com contexto.
17. **`any` / cast forçado / `@ts-ignore`** — proibido sem justificativa escrita no código.
18. **Validação ausente em entrada externa** — input de request, env var, resposta de
    API externa, tudo é hostil até ser validado.
19. **Mutação de argumento ou de estado global compartilhado.**
20. **Promise sem `await`, erro assíncrono não tratado, race condition.**
21. **Injeção** — SQL/comando montado por concatenação de string. Sempre parametrizado.
22. **Log de dado sensível** — credencial, token, PII, corpo de request com segredo.

---

## 3. Definition of Done — rodar ao fim de CADA tarefa

Nenhuma tarefa é dada como concluída antes de os três comandos abaixo passarem,
nesta ordem:

```
1. testes     # suíte completa, verde, sem skip novo
2. lint       # eslint sem erro E sem warning novo
3. build      # compilação/typecheck sem erro
```

Regras de operação:
- Rodar **de fato** e mostrar a saída. Não presumir que passou.
- **Vermelho não se contorna:** não se desliga regra de lint, não se adiciona
  `eslint-disable`, não se marca teste como skip, não se relaxa o tsconfig para
  fazer a barra ficar verde. Conserta-se a causa.
- Se algo falhar e a correção estiver fora do escopo da tarefa, a falha é **reportada
  explicitamente** — nunca silenciada.
- Commit só depois dos três verdes. Histórico de commits legível, um commit por
  unidade lógica de trabalho.

---

## 4. Credenciais e segredos

- **Nunca** commitar credencial, token, API key, senha, string de conexão com senha,
  certificado ou chave privada — nem em código, teste, fixture, seed, script,
  comentário, README, log ou mensagem de commit.
- Configuração sensível vem **exclusivamente de variável de ambiente**, lida e validada
  em um único ponto de entrada.
- `.env` fica no `.gitignore`. O repositório versiona apenas `.env.example` com chaves
  e valores de exemplo obviamente falsos.
- Testes usam valores fake explícitos (`"test-secret"`), nunca credencial real de
  nenhum ambiente.
- Nunca imprimir segredo em log, mensagem de erro, stack trace ou resposta de API.
- Se um segredo vazar para o histórico do git: rotacionar a credencial primeiro,
  limpar o histórico depois. Nesta ordem.
