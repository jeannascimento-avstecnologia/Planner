# Plano ativo — Fase 2 (6 épicos comerciais)

> Status: **ativo** | Aprovado: product owner (MVP concluído)  
> ADRs: [0009](../docs/20-architecture/ADR-0009-fase2-reabertura-fast-follow.md), [0010](../docs/20-architecture/ADR-0010-stack-extensions-fase2.md), [0011](../docs/20-architecture/ADR-0011-event-sourcing-card-events.md)

## Objetivo

Entregar 6 épicos comerciais pós-MVP com SDD rigoroso: spec aprovada → código → pgTAP/Vitest/Playwright.

## Ordem de execução (dependência técnica)

| # | Épico | Spec principal | Depende de |
|---|-------|----------------|------------|
| 0 | Fundação `card_events` | ADR-0011 | — |
| 1 | **F.1** Audit Log | [audit-log.md](../docs/50-components/audit-log.md) | card_events |
| 2 | **F.2** Field-level permissions | [field-level-permissions.md](../docs/50-components/field-level-permissions.md) | F.1 |
| 3 | **D** Views interativas | [views-interactive.md](../docs/50-components/views-interactive.md), [timeline-redesign.md](../docs/40-features/timeline-redesign.md) (Timeline), [card-dependencies.md](../docs/30-data/card-dependencies.md) | F.2 (`update_card_fields` no write de datas; F.2 completo permanece épico próprio) |
| 3b | **D.Tree** Board Tree View | [board-tree-view.md](../docs/50-components/board-tree-view.md), [card-parent-hierarchy.md](../docs/30-data/card-parent-hierarchy.md) | Shared Kernel (P1); paralelo a D |
| 4 | **E** Workload | [workload-capacity.md](../docs/50-components/workload-capacity.md) | D (cards editáveis) |
| 5 | **C** Whiteboard | [whiteboard.md](../docs/50-components/whiteboard.md) | — |
| 6 | **B** Multiplayer | [realtime-multiplayer.md](../docs/50-components/realtime-multiplayer.md) | — |
| 7 | **A** Automações ECA | [automations-eca.md](../docs/50-components/automations-eca.md) | card_events maduro |
| ∥ | **F.3** SAML/SSO | [sso-saml.md](../docs/70-ops/sso-saml.md) | paralelo |
| ∥ | **Debug report** | [debug-report.md](../docs/50-components/debug-report.md) | paralelo (ops; e-mail, sem tabela) |

## Decisões travadas

- `card_events` append-only; purge só via `app.purge_card_events_before` (security definer).
- Automações: async via Supabase Database Webhooks → Edge Function; profundidade máx 3.
- Presence: throttle 100ms, delta > 5px.
- Whiteboard: debounce persist 500ms; sem CRDT de traço ao vivo.
- Dependências: trigger anti-ciclo em `card_dependencies`. Timeline v1 é **display-only** (sem criar/editar links).
- **D.Timeline:** spec filha [timeline-redesign.md](../docs/40-features/timeline-redesign.md). Precisão diária; drop abre modal; resize persiste direto; zoom/grupo na URL. **Exceção RLS aprovada:** migration somente de policy `card_deps_select` (`app.can_access_board` no board do blocker) + pgTAP; sem DDL de schema.
- **D.Tree:** hierarquia N níveis via `cards.parent_id`; depth máx 8; anti-ciclo + cross-board no DB; Kanban roots-only + badge; DnD v1 sibling-only; writes via Shared Kernel.
- Workload: MV + cache; sem time tracking.
- **Debug report:** botão “Reportar problema” (sidebar + Ctrl/Cmd+Shift+D); destino e-mail `DEBUG_REPORT_RECIPIENTS`; sem tabela/migration; write via `POST /api/debug-reports` + Resend.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Loop automação | `trigger_depth` ≤ 3 |
| Race em card | `updated_at` optimistic + advisory lock |
| Flood Realtime | throttle + Presence channel |
| Canvas lag | virtualização tldraw + debounce |
| Ciclo Gantt | DFS trigger |
| Agregação lenta | MV `workload_by_member_week` |

## Gate SDD

**Implementação de código de cada épico só inicia após aprovação explícita da spec correspondente.**

Specs Fase 2 escritas em `docs/` (ver links acima). Próximo gate: aprovação de `audit-log.md` antes de UI `/settings/audit`.

## Fora de escopo (global Fase 2)

- Zapier/Slack/email externo nas automações v1
- Editor drag-and-drop de regras
- Histórico Git de texto (Yjs só estado atual)
- Import Figma/PDF complexo no whiteboard
- PDF Gantt / resource leveling
- Time tracking / timesheets
- DLP / E2EE de descrições
