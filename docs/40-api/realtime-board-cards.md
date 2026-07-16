# Realtime — Board cards channel (invalidate-only)

> Spec componente: [board-cards-query-realtime.md](../50-components/board-cards-query-realtime.md).

## Contrato

| Campo | Valor |
|-------|-------|
| Channel | `board:{boardId}:cards` |
| Mecanismo | Supabase Realtime `postgres_changes` |
| Tabela | `public.cards` |
| Eventos | `INSERT` \| `UPDATE` \| `DELETE` (`*`) |
| Filter | `board_id=eq.{boardId}` |
| Client handler | Debounce → `queryClient.invalidateQueries({ queryKey: ["board", boardId, "cards"] })` |
| Payload | **Não** usado como SoT; row pode vir no evento mas a UI **não** espelha — refetch via Query |

## Não fazer

- Fan-out de row completa para re-render sem Query.
- Incluir analytics / `card_events` / automations no mesmo canal hot path.
- Subscribe cross-board ou canal global.

## Pré-requisito DB

- `cards` na publication `supabase_realtime`.
- `REPLICA IDENTITY FULL` em `cards` para filter `board_id` em `DELETE`.

## Segurança

- RLS `cards_select` (`can_access_board`) aplica-se ao Realtime.
- Só membros com SELECT recebem eventos do board.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Publication + replica | migration `*_cards_realtime_publication.sql` | `db push` / migrate |
| Subscribe + invalidate | `use-board-cards-realtime.ts` | manual 2 clients |
| Query key | `board-cards-keys.ts` | Vitest |
