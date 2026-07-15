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
| `workload` | `/workload` | Header, modo semana/15d, tabela/heatmap *(so gestores)* |
| `settings` | `/settings` (hub) | Header, org switcher, cards org/admin |
| `help` | `/help` | Busca/indice, categorias, tour global |
| `board-kanban` | `/boards/[boardId]` (sem subpath) | Header, visoes, filtros, colunas, acoes |

Storage: `ngp:page-tour-completed:{tourId}` = `"1"`.

**Disparo automatico:** ~600 ms–1,5 s apos navegar, somente se:
1. existe **organizacao ativa** (`ngp:active-org` / membership valida);
2. tour global completo (para page tours);
3. tour da pagina incompleto no `localStorage`.

**Sem organizacao ativa:** nenhum auto-start (global nem pagina). Reabrir manual via `/help` ou botao do header permanece permitido.

**Anti-loop:** fechar (X), Esc, Concluir ou `destroy` do Driver **sempre** grava completed. Se alvos `data-tour` nao existirem no DOM, nao iniciar auto-start (evitar overlay quebrado + reabertura infinita).

## Diretrizes de copy

- Segunda pessoa, confiante; titulo = outcome; descricao = 2–3 frases com ferramentas reais.
- Evitar "Use Proximo", "clique aqui", jargao vazio.

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
- [ ] Sem alvos no DOM: auto-start nao inicia (sem loop)
- [ ] Tours nao empilham (fila unica)
- [ ] `/boards` ≠ `/boards/[id]` (tours distintos)
- [ ] Carga omitida sem `showWorkload`
- [ ] Botao **Ver tour desta pagina** nas rotas com tour
- [ ] `/help` lista tours por area
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
| Gate org + alvos | `onboarding-tour-provider.tsx`, `tour-targets-ready.ts` | `tour-targets-ready.test.ts` + E2E sem org |
| Reabrir | `page-tour-trigger.tsx`, `help-center.tsx` | E2E botao |
