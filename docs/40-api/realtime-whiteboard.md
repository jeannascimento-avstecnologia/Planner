# Realtime — Whiteboard channel

> Spec componente: [whiteboard.md](../50-components/whiteboard.md).

## Persistência

| Operação | Mecanismo |
|----------|-----------|
| Save | Server Action ou RPC `app.upsert_whiteboard_snapshot(board_id, snapshot)` |
| Load | SSR initial + TanStack Query |
| Sync remoto | Supabase Realtime `postgres_changes` UPDATE on `board_whiteboards` |

## RPC

```sql
app.upsert_whiteboard_snapshot(
  p_board_id uuid,
  p_snapshot jsonb
) RETURNS void
```

- Valida `can_write_board`.
- Sets `updated_at`, `updated_by = auth.uid()`.
- Emite `card_events` scope board: `whiteboard_updated` (payload: `{ byte_size }` only — sem snapshot completo no audit).

## Payload limits

- Max 2MB jsonb; RPC rejeita acima.
- Gzip client-side opcional fast-follow.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| RPC upsert | migration | pgTAP |
| Realtime filter | supabase channel | Vitest |
| Size guard | RPC check | pgTAP |
