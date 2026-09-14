# D — Views interativas (Timeline, Calendário, Tabela)

> Depende de: [field-level-permissions.md](./field-level-permissions.md) — o slice usado aqui é o RPC `update_card_fields` (já no kernel). F.2 completo (strip SSR, matriz UI) permanece épico próprio.  
> Dados: [card-dependencies.md](../30-data/card-dependencies.md).  
> Timeline (detalhe): [timeline-redesign.md](../40-features/timeline-redesign.md).  
> **Gate SDD:** implementação após aprovação desta spec (Timeline: após a spec filha).

## Contexto

Modos timeline/calendar/table existem ([board-view-modes.md](./board-view-modes.md)). Fase 2 torna edição bidirecional: datas na Timeline, dependências Gantt **somente leitura nesta fatia**, inline edit tabela — persistindo via RPC hardened (`update_card_fields`).

## Objetivos

- Timeline: ver [timeline-redesign.md](../40-features/timeline-redesign.md) (layout por linha, zoom, agrupamento, modal de período, resize diário, setas FS display-only).
- Calendário: exibe `target_date` como eixo de planejamento; `due_date` visível como prazo final quando distinto.
- Tabela: inline edit células permitidas (F.2), incluindo `estimated_hours`, `target_date`, `due_date`.

## Não-objetivos

- Critical path / auto-scheduling (MS Project).
- Export PDF Gantt.
- Dependências SS/FF/SF (só finish-to-start v1).
- Edição de dependências por drag na Timeline (fast-follow; v1 = display-only).
- Edição multi-card bulk (fast-follow).

## Requisitos

### Timeline (Gantt)

Fonte de verdade: [timeline-redesign.md](../40-features/timeline-redesign.md).

Resumo desta fatia (não reabrir aqui):

- Precisão diária; drop de backlog/barra abre modal de início/fim; resize nas bordas persiste direto.
- Zoom Dia/Semana/Mês/Trimestre; agrupamento após `CardFilterBar`.
- Setas FS a partir de `card_dependencies` existente; sem create/delete na UI.
- Write de datas só via `updateCardFieldsAction` → RPC `update_card_fields`.

### Calendário

- Reutilizar `calendar-grid.ts`; DnD `@dnd-kit` entre células.
- Drop: `due_date = targetDay`; respeita field permissions.
- Optimistic UI + rollback on 403.

### Tabela

- Células editáveis: title, priority, dates, assignee (combobox), column (select).
- Enter/blur commit; Escape revert.
- Ordenação client-side mantida; edição não re-sort até refresh.

### Realtime

- Supabase Realtime `cards` UPDATE — merge remoto sem sobrescrever edição local ativa (lock por cell id).

### Eventos

- `card_updated` via triggers. Audit `dependency_created` / `dependency_removed` permanece dívida (não nesta fatia).

## Critérios de aceite

### Timeline

Delegados a [timeline-redesign.md](../40-features/timeline-redesign.md). Não duplicar checklist aqui.

### Calendário / Tabela / Viewer

- [ ] Viewer não dragga (UI disabled + RPC 403).
- [ ] Calendário drag move card para terça; due_date = terça.
- [ ] Tabela inline edit title funciona para manager.

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Cards sem datas no Gantt | zona "backlog" — resolvido na spec filha |
| 2 | Criar dependência na Timeline | Fast-follow; v1 display-only |

## Specs vinculadas

- [timeline-redesign.md](../40-features/timeline-redesign.md)
- [board-view-modes.md](./board-view-modes.md)
- [card-dependencies.md](../30-data/card-dependencies.md)
- [field-level-permissions.md](./field-level-permissions.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Timeline (fatia D.Timeline) | ver spec filha | Vitest + Playwright `timeline.spec.ts` + pgTAP SELECT |
| Calendar DnD | `board-calendar-view.tsx` | Playwright |
| Table inline | `board-table-view.tsx` | Playwright |
| Anti-ciclo trigger | `*_card_dependencies_cycle.sql` | dívida: `33_*` ainda não existe |
| RPC dates | `app.update_card_fields` | pgTAP existente |
