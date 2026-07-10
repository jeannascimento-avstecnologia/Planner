# Tour guiado (onboarding spotlight)

## Objetivo

Tour interativo na primeira visita autenticada ao app, estilo spotlight, destacando itens reais da sidebar. Controles Voltar / Proximo / Fechar, persistencia em `localStorage` e botao em `/help` para reabrir.

## Rotas

- Qualquer rota autenticada `(app)/*` — tour montado no shell (`AppShellStreaming`).
- Reabrir manualmente: `/help` → botao **Ver tour guiado**.

## Biblioteca

- **Driver.js** (MIT) — spotlight + popover, import dinamico no cliente.

## Passos do tour

| # | Alvo `data-tour` | Titulo | Conteudo (resumo) |
|---|------------------|--------|-------------------|
| 1 | — (central) | Bem-vindo ao Agify | Introducao rapida ao tour |
| 2 | `nav-boards` | Home | Grade de projetos, prazos e mini-calendario |
| 3 | `nav-projects` | Projetos | Hub com filtros e painel lateral |
| 4 | `nav-calendar` | Calendario | Visao unificada de prazos |
| 5 | `nav-plan` | Meu plano | Trabalho do dia por responsavel |
| 6 | `nav-workload` | Carga | Visao de carga da equipe *(so se `showWorkload`)* |
| 7 | `nav-help` | Ajuda | Centro de ajuda; menciona reabrir o tour |
| 8 | `nav-settings` | Configuracoes | Org, membros, integracoes |
| 9 | — (central) | Pronto | CTA para comecar |

Copy derivada de `apps/web/lib/help-content.ts`.

## Componentes

| Arquivo | Papel |
|---------|-------|
| `apps/web/lib/onboarding-tour-steps.ts` | Definicao dos passos |
| `apps/web/lib/onboarding-tour-storage.ts` | `ngp:onboarding-tour-completed` |
| `apps/web/components/onboarding/onboarding-tour-provider.tsx` | Context + Driver.js |
| `apps/web/components/shell/app-sidebar.tsx` | `data-tour` nos links |
| `apps/web/components/shell/app-shell-streaming.tsx` | Mount do provider |
| `apps/web/components/help/help-center.tsx` | Botao reabrir |
| `apps/web/app/globals.css` | Tema `.agify-tour-popover` |

## Persistencia

- Chave: `ngp:onboarding-tour-completed` = `"1"` apos fechar ou concluir.
- Por browser/dispositivo (sem Supabase no MVP).

## UX

- Auto-start ~600 ms na 1a visita se chave ausente.
- Sidebar expandida ao iniciar; drawer mobile aberto em viewport `< md`.
- `prefers-reduced-motion`: desativa animacao do Driver.
- `aria-live="polite"` anuncia mudanca de passo.

## Nao-objetivos

- Persistencia server-side
- Tour multi-rota com navegacao entre paginas
- CMS de passos

## Criterios de aceite

- [ ] Tour abre na 1a visita autenticada (`localStorage` vazio)
- [ ] Spotlight em cada link da sidebar
- [ ] Voltar, Proximo, Fechar e progresso funcionam
- [ ] Fechar/concluir nao reabre automaticamente
- [ ] `/help` tem botao **Ver tour guiado** (`data-testid="onboarding-tour-trigger"`)
- [ ] Passo Carga omitido sem `showWorkload`
- [ ] E2E `onboarding-tour.spec.ts` verde

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Passos | `onboarding-tour-steps.ts` | E2E contagem de passos |
| Storage | `onboarding-tour-storage.ts` | E2E dismiss persiste |
| Spotlight | `onboarding-tour-provider.tsx` | E2E popover visivel |
| `data-tour` | `app-sidebar.tsx` | E2E highlight |
| Auto 1a visita | `onboarding-tour-provider.tsx` | E2E init script |
| Reabrir | `help-center.tsx` | E2E botao Ajuda |
