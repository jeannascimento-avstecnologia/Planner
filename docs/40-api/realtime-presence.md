# Realtime — Presence channel

> Spec componente: [realtime-multiplayer.md](../50-components/realtime-multiplayer.md).

## Channel contract

```
Channel name: presence:board:{boardId}
Type: Realtime Presence + Broadcast
```

### Track payload (local state)

```typescript
interface PresencePayload {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: string; // hash userId → palette
  cursor: { x: number; y: number } | null;
  activeCardId: string | null;
  viewport: 'kanban' | 'timeline' | 'calendar' | 'table' | 'whiteboard';
}
```

### Throttle rules (client)

- `mousemove` → buffer → flush every **100ms**.
- Skip if `hypot(dx,dy) < 5`.
- `beforeunload` → untrack.

### Authorization

- Client obtains board access via existing session.
- Server middleware validates board membership before page render; channel join client-side with RLS JWT (same as today).

### Limits

- Max 50 presence keys per channel (Supabase default); UI truncates display.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| useBoardPresence | `hooks/use-board-presence.ts` | Vitest fake timers |
| Color hash | `lib/presence-color.ts` | Vitest |
| Overlay | `board-presence-layer.tsx` | Playwright |
