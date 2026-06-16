# Calendario de prazos

## Rotas
- `/calendar` — grade mensal + lista de cards com `due_date`.
- `/api/ical/[token]` — feed `.ics` via RPC `get_ical_feed_cards` (anon).

## UI
- `apps/web/app/(app)/calendar/page.tsx`
- `calendar-client.tsx` — dias clicaveis (button)
- `deadline-agenda-modal.tsx` — vincular existente / criar prazo
- `DeadlineTiles` em `/boards` (grid de quadrados, so prazos preenchidos)

## Clique em dia
- **Com eventos:** lista do dia + links para board.
- **Vazio:** abre `DeadlineAgendaModal` com data pre-selecionada.

## Server actions (`calendar/actions.ts`)
- `searchOrgCards`, `assignDueDate`, `createDeadlineCard`

## Criterios
- Cards com prazo aparecem no mes correto.
- Badge atrasado no Kanban quando `due_date < now` e nao completo.
