# D — Views interativas (Timeline, Calendário, Tabela)

> Depende de: [field-level-permissions.md](./field-level-permissions.md).  
> Dados: [card-dependencies.md](../30-data/card-dependencies.md).  
> **Gate SDD:** implementação após aprovação desta spec.

## Contexto

Modos timeline/calendar/table existem read-only ([board-view-modes.md](./board-view-modes.md)). Fase 2 torna edição bidirecional: drag/resize datas, dependências Gantt, inline edit tabela — tudo persistindo via RPC hardened (F.2).

## Objetivos

- Timeline: drag barra altera `start_date`/`due_date`; resize handles; setas de dependência FS.
- Calendário: drag card entre dias atualiza `due_date`.
- Tabela: inline edit células permitidas (F.2).
- Anti-ciclo em dependências ao criar link Gantt.

## Não-objetivos

- Critical path / auto-scheduling (MS Project).
- Export PDF Gantt.
- Dependências SS/FF/SF (só finish-to-start v1).
- Edição multi-card bulk (fast-follow).

## Requisitos

### Timeline (Gantt)

- Biblioteca: `@visx/visx` ou custom SVG (avaliar bundle); barras draggable.
- Drag horizontal: snap dia; debounce 300ms → `app.update_card_fields`.
- Resize left/right: altera `start_date` / `due_date` respectivamente.
- Dependências: click origem → destino cria row `card_dependencies(blocker_id, blocked_id)`; render seta; delete via context menu.
- Validação ciclo: trigger DB ([card-dependencies.md](../30-data/card-dependencies.md)).

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

- `card_updated` via triggers; `dependency_created` / `dependency_removed` scope `card`.

## Critérios de aceite

- [ ] Drag barra timeline persiste datas após refresh.
- [ ] Criar dependência A→B e tentar B→A falha com erro claro.
- [ ] Viewer não dragga (UI disabled + RPC 403).
- [ ] Calendário drag move card para terça; due_date = terça.
- [ ] Tabela inline edit title funciona para manager.
- [ ] Playwright: fluxo timeline drag + assert DB.

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Cards sem datas no Gantt | zona "backlog" fixa à esquerda |

## Specs vinculadas

- [board-view-modes.md](./board-view-modes.md)
- [card-dependencies.md](../30-data/card-dependencies.md)
- [field-level-permissions.md](./field-level-permissions.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Timeline DnD | `board-timeline-view.tsx` | Playwright |
| Dependency UI | `timeline-dependency-layer.tsx` | E2E |
| Calendar DnD | `board-calendar-view.tsx` | Playwright |
| Table inline | `board-table-view.tsx` | Playwright |
| Anti-ciclo trigger | `*_card_dependencies_cycle.sql` | pgTAP |
| RPC dates | `app.update_card_fields` | pgTAP |
