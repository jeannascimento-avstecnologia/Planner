# Tour guiado (onboarding spotlight)

## Objetivo

Dois niveis de tour interativo estilo spotlight (Driver.js):

1. **Tour global** — primeira visita autenticada; orienta pelas areas da sidebar.
2. **Tours por pagina** — primeira visita a cada rota principal (apos o global); ensina ferramentas e fluxos da tela.

Copy com tom de produto premium (beneficio + nomes reais de ferramentas), derivada de `apps/web/lib/help-content.ts`.

## Rotas

- Shell: `(app)/*` via `AppShellStreaming` + `OnboardingTourProvider`.
- Reabrir global: `/help` → **Ver tour guiado**.
- Reabrir por pagina: botao **Ver tour desta pagina** no header + secao **Tours por area** em `/help`.

## Biblioteca

- **Driver.js** (MIT) — import dinamico no cliente; motor em `tour-driver.ts`.

## Tour global (sidebar)

| # | Alvo `data-tour` | Foco |
|---|------------------|------|
| 1 | — | Boas-vindas |
| 2 | `nav-boards` | Home |
| 3 | `nav-projects` | Projetos |
| 4 | `nav-calendar` | Calendario |
| 5 | `nav-plan` | Meu plano |
| 6 | `nav-workload` | Carga *(so `showWorkload`)* |
| 7 | `nav-help` | Ajuda |
| 8 | `nav-settings` | Configuracoes |
| 9 | — | Encerramento |

## Tours por pagina

| tourId | Rota | Passos (resumo) |
|--------|------|-----------------|
| `home` | `/boards` (exato) | Header, prazos 7d, visualizacao, grade, novo projeto |
| `projects` | `/projects` | Header, filtros, grade, painel lateral |
| `calendar` | `/calendar` | Header, iCal, grade mensal, lista |
| `plan` | `/plan` | Header, legenda, toolbar, sidebar, grade |
| `workload` | `/workload` | Header, modo semana/15d, tabela/mapa de cores *(so gestores)* |
| `settings` | `/settings` (hub) | Header, org switcher, cards org/admin |
| `help` | `/help` | Busca/indice, categorias, tour global |
| `board-kanban` | `/boards/[boardId]` (sem subpath) | Header, visoes, guia Arvore, filtros, colunas, acoes |

Storage: `ngp:page-tour-completed:{tourId}` = `"1"`.

**Disparo automatico:** ~600 ms–1,5 s apos navegar, somente se:
1. existe **organizacao ativa** (`hasActiveOrg` no shell / cookie membership);
2. tour global completo (para page tours);
3. tour da pagina incompleto no `localStorage`;
4. **ready** = `hasActiveOrg && targetsPresent` — wait com retry/backoff (`waitForRequiredTourTargets`, max ~8 tentativas). Abort ou esgotamento **nao** marca completed.

**Sem organizacao ativa:** nenhum auto-start (global nem pagina), inclusive na UI “Crie sua organizacao”. Apos create-org (`hasActiveOrg` false→true), reavalia e tenta de novo. Reabrir manual via `/help` ou botao do header permanece permitido.

**Anti-loop:** fechar (X), Esc, Concluir ou `destroy` do Driver **sempre** grava completed (so apos tour iniciado). Abort do wait/retry **nao** grava completed.

## Diretrizes de copy

- Segunda pessoa, confiante; titulo = outcome; descricao = **1–2 frases curtas** (ideal: uma linha), com ferramentas reais.
- Evitar "Use Proximo", "clique aqui", jargao vazio e filler.
- Preferir copy dedicada nos tours; nao concatenar `help-content` inteiro no popover.
- **Tom didatico para usuario leigo (PT-BR):** descrever o que a pessoa ve/faz na tela; frases curtas e orientadas a acao.
- **Proibido em copy de usuario** (tour, help e `PAGE_COPY`): jargao tecnico/ingles de UX — ex.: Breadcrumb, tile, drawer, swimlanes, heatmap, drilldown, handles, pan, chips, grip, chunk, Realtime, optimistic, RLS, RPC, SSR, MIME, `due_date`, WIP, throughput.
- **Preferir:** caminho de volta, link Voltar, nome do projeto no topo, barra superior, cartao do projeto, quadro (Kanban), painel do card, faixas por responsavel, mapa de cores, detalhes, icone de arrastar, pontos de conexao.

## Componentes

| Arquivo | Papel |
|---------|-------|
| `lib/tour-driver.ts` | Motor Driver.js compartilhado |
| `lib/onboarding-tour-steps.ts` | Passos tour global |
| `lib/page-tour-registry.ts` | `pathname` → `tourId` |
| `lib/page-tour-steps.ts` | Passos por pagina |
| `lib/page-tour-storage.ts` | Persistencia por pagina |
| `lib/help-tour-copy.ts` | Helper `helpSectionToTourSteps` |
| `components/onboarding/onboarding-tour-provider.tsx` | Context + fila unica |
| `components/onboarding/page-tour-auto-trigger.tsx` | Auto-start por rota |
| `components/onboarding/page-tour-trigger.tsx` | Botao reabrir |
| `components/shell/app-sidebar.tsx` | `data-tour` nav |
| Paginas `(app)/*` | `data-tour` por regiao |

## Persistencia

- Global: `ngp:onboarding-tour-completed`
- Por pagina: `ngp:page-tour-completed:{tourId}`
- Por browser/dispositivo (sem Supabase no MVP).

## UX

- Global auto-start na 1a visita; page tour apos global.
- Sidebar expandida no global; drawer mobile `< md`.
- `prefers-reduced-motion`: sem animacao Driver.
- `aria-live="polite"` no provider.

## Nao-objetivos

- Persistencia server-side
- CMS de passos
- Tours em Whiteboard, Automacoes, subpaginas de Settings *(fast-follow)*

## Criterios de aceite

- [ ] Tour global abre na 1a visita **com org ativa**; copy premium (nao generico)
- [ ] Tour por pagina abre na 1a visita apos global **com org ativa**
- [ ] **Sem org ativa: auto-start nao dispara** (global nem pagina)
- [ ] Fechar/dismiss/concluir **persiste**; reload da mesma rota **nao** reabre automaticamente
- [ ] Sem alvos no DOM: wait/retry; abort **nao** marca completed; sem loop
- [ ] Apos create-org: reavalia e sobe uma vez quando targets prontos
- [ ] Tours nao empilham (fila unica)
- [ ] `/boards` ≠ `/boards/[id]` (tours distintos)
- [ ] Carga omitida sem `showWorkload`
- [ ] Botao **Ver tour desta pagina** nas rotas com tour
- [ ] `/help` lista tours por area
- [ ] Copy do tour (global + pagina), help vinculada e `PAGE_COPY` **sem jargao** (breadcrumb, tile, drawer, etc.); tom didatico para leigo
- [ ] E2E `onboarding-tour.spec.ts` e `page-tour.spec.ts` verdes (incluir caso sem org + persistencia dismiss)

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Passos global | `onboarding-tour-steps.ts` | `onboarding-tour-steps.test.ts` |
| Registry rotas | `page-tour-registry.ts` | `page-tour-registry.test.ts` |
| Passos pagina | `page-tour-steps.ts` | `page-tour-steps.test.ts` |
| Storage global | `onboarding-tour-storage.ts` | E2E dismiss |
| Storage pagina | `page-tour-storage.ts` | E2E page tour |
| Motor | `tour-driver.ts` | E2E popover |
| Auto page | `page-tour-auto-trigger.tsx` | E2E navegacao |
| Gate org + alvos + retry | `onboarding-tour-provider.tsx`, `tour-targets-ready.ts` | `tour-targets-ready.test.ts` (ready/abort/backoff) + E2E |
| Reabrir | `page-tour-trigger.tsx`, `help-center.tsx` | E2E botao |
