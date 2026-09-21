---
schema_version: "compozy.tasks/v2"
workflow: url-shortener
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
    - id: task_03
      file: task_03.md
    - id: task_04
      file: task_04.md
    - id: task_05
      file: task_05.md
  edges:
    - from: task_01
      to: task_02
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_01
      to: task_04
    - from: task_02
      to: task_04
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
---

# URL Shortener Task List

Decomposição do `_techspec.md` seguindo seu Build Order. Cinco tasks, uma cadeia de
dependência real (fundação → repositórios → serviços → rotas) com um ponto de
paralelização: task_03 (serviços de escrita) e task_04 (serviços de leitura) não
dependem uma da outra, só de task_01 e task_02, e podem rodar em paralelo.

| Task | Título | Tipo | Complexidade | Testes atribuídos |
|---|---|---|---|---|
| task_01 | Fundação: tipos, erros, clock, validação, geração de código | backend | low | 15 UT |
| task_02 | Repositórios: `links` e `clicks` | backend | medium | 6 IT |
| task_03 | Serviços de escrita: encurtar e redirecionar | backend | medium | 10 UT |
| task_04 | Serviços de leitura: listagem, estatísticas e página de analytics | backend | low | 8 UT |
| task_05 | Rotas HTTP, wiring do app e jornadas completas | backend | high | 15 IT + 3 E2E |

Todo ID de `_tests.md` (33 UT + 21 IT + 3 E2E = 57) está atribuído a exatamente uma
task acima.
