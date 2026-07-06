# ADR-0010: Extensões de stack — Fase 2

- Status: Aceito
- Data: 2026-07-06

## Contexto

Fase 2 adiciona whiteboard, CRDT colaborativo, motor de automação assíncrono e painéis analíticos. Stack base (ADR-0001) permanece Supabase-first.

## Decisão

### Pacotes npm (apps/web)

| Pacote | Épico | Uso |
|--------|-------|-----|
| `@tldraw/tldraw` | C | Canvas whiteboard |
| `yjs` | B | CRDT descrição/comentários |
| `@tiptap/react`, `@tiptap/starter-kit` | B | Rich-text editor |
| `@hocuspocus/provider` ou `y-supabase` | B | Sync Yjs (avaliar na impl.) |

### Infra Supabase

| Mecanismo | Épico | Uso |
|-----------|-------|-----|
| Realtime Presence + Broadcast | B | Cursores |
| Realtime Postgres Changes | C | Shapes debouncados |
| Database Webhooks | A | INSERT em `card_events` → Edge Function |
| Edge Function `automation-runner` | A | ECA async |
| `pg_cron` | F.1, E | Retenção audit; refresh MV workload |

### Estado (camada 4 guia)

- Zustand: UI efêmera (presence local, modal state).
- TanStack Query: audit list, workload aggregates.
- Yjs: documentos colaborativos (não substituir TanStack para entidades card).

## Alternativas consideradas

- Lexical em vez de TipTap: rejeitado na spec B (TipTap + Yjs ecosystem maduro).
- Motor automação síncrono em Server Action: rejeitado (latência, loops).
- WebSocket próprio fora Supabase: rejeitado (custo operacional).

## Consequências

- `package.json` apps/web ganha deps por épico (incremental).
- Edge Function secrets via Supabase Dashboard only.
- Performance budgets atualizados em `docs/60-quality/performance-budgets.md` na impl. de C/B.
