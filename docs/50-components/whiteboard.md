# C — Whiteboard (tldraw)

> Stack: [ADR-0010](../20-architecture/ADR-0010-stack-extensions-fase2.md).  
> API: [realtime-whiteboard.md](../40-api/realtime-whiteboard.md).  
> **Gate SDD:** implementação após aprovação desta spec.

## Contexto

Boards precisam canvas colaborativo leve (brainstorm, fluxos). MVP S8 não entvisible; Fase 2 entrega via `@tldraw/tldraw` com persist JSONB debouncada.

## Objetivos

- Um whiteboard por board (aba ou rota `/boards/[id]/whiteboard`).
- Persistência `board_whiteboards.snapshot` (JSON tldraw).
- Realtime: postgres changes debounced 500ms — sem sync stroke-by-stroke.
- Virtualização / viewport default para boards grandes.

## Não-objetivos

- CRDT multi-user ao vivo no traço (B cobre texto; canvas = debounce persist).
- Import Figma/PDF.
- Vincular shapes a cards automaticamente (fast-follow).
- Version history de snapshots.

## Requisitos

### Schema

```sql
board_whiteboards (
  board_id uuid PK REFERENCES boards,
  org_id uuid NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz,
  updated_by uuid REFERENCES profiles
)
```

RLS: mesmo acesso do board (`can_read_board` / write).

### Cliente

- `@tldraw/tldraw` v2+; lazy load route.
- `useDebouncedCallback(500ms)` → upsert snapshot.
- Load inicial: fetch snapshot; merge se `updated_at` remoto > local após idle.
- Throttle save: max 1 write/500ms por sessão.

### Realtime

- Subscribe `board_whiteboards` UPDATE filtrado `board_id=eq.X`.
- Ignorar eco próprio via `updated_by` + client instance id.

### Performance

- Budget: TTI whiteboard < 3s em 4G; snapshot max 2MB (warn admin se exceder).

## Critérios de aceite

- [ ] Desenhar shape, refresh página — shape persiste.
- [ ] Dois usuários: segundo vê update após debounce (~1s), sem lag durante traço.
- [ ] Viewer read-only: ferramentas desabilitadas.
- [ ] Snapshot inválido JSON → fallback canvas vazio + log server.

## Specs vinculadas

- [realtime-whiteboard.md](../40-api/realtime-whiteboard.md)
- [realtime-multiplayer.md](./realtime-multiplayer.md) (presence opcional no canvas)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Tabela + RLS | `*_board_whiteboards.sql` | pgTAP |
| Page + editor | `board-whiteboard-view.tsx` | Playwright |
| Debounced save | `use-whiteboard-persist.ts` | Vitest |
| Realtime merge | `use-whiteboard-realtime.ts` | Vitest mock |
| Lazy route | `whiteboard/page.tsx` | Lighthouse budget |
