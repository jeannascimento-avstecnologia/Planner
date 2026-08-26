# Notificacoes Inteligentes (S5)

Combate o "notification overload" (dor citada por usuarios de Asana/Trello). Default = sinal, nao ruido.

## Modelo
- `notifications(id, org_id, user_id, type, title, body, entity_type, entity_id, read_at, created_at)`.
- `notification_prefs(user_id, org_id, channel, event_type, enabled, digest)` - granular por evento/canal.
- `push_subscriptions(user_id, endpoint, p256dh, auth)` - Web Push (VAPID).

## Eventos que notificam (por padrao)
- Mencao (@), atribuicao de card, comentario em card que sigo, prazo proximo/atrasado, dependencia desbloqueada.
- NAO notificar toda micro-mudanca (anti-overload).

## Entrega
- In-app inbox (Realtime) + Web Push (Serwist service worker).
- Digest/batching e Do-Not-Disturb processados no servidor (`notify-digest` cron).
- DND por usuario (janela horaria / dias).

## Criterios de Aceite
- Usuario controla por evento e canal; pode desligar email/push sem perder inbox.
- Respeita DND; agrupa em digest quando configurado.

---

## MVP deste ciclo (recorte in-app)

Escopo reduzido: apenas inbox in-app (sino na sidebar). Sem Web Push, email, digest, DND, prefs.

### Tabela (migration 0007)
`notifications(id, org_id, user_id, type, title, body, entity_type, entity_id, read_at, created_at)`.

### Tipos
- `deadline_soon` — card com prazo em <= 3 dias.
- `member_added` — alguem entrou em um projeto que voce participa.
- `card_created` — nova entrega criada em projeto que voce participa.

### Geracao (sem cron)
- `public.sync_deadline_notifications()` (SECURITY DEFINER) — chamada no layout `(app)`; idempotente (dedupe por user+entity+type em janela de 2 dias).
- `public.notify_board(...)` (SECURITY DEFINER) — chamada por `createCard` e `accept_board_invitation`; notifica demais membros do board, exclui o ator.

### RLS
- SELECT/UPDATE: `user_id = (select auth.uid())`. INSERT direto negado ao cliente (apenas via funcoes SECURITY DEFINER).

### Criterios de aceite (MVP)
- User A nao ve notificacoes de B (pgTAP).
- Sino mostra contador de nao-lidas; "marcar todas como lidas" zera.

---

## MVP email transacional (Resend)

Escopo: email para eventos criticos + dedupe via `notification_log`. Sem prefs/DND/digest.

### Tabela `notification_log`
`id, org_id, recipient_id, event_type, entity_id (text), sent_at` — unique `(recipient_id, event_type, entity_id)`.

### Eventos email
| Evento | Trigger | Recipiente |
|--------|---------|------------|
| `task_assigned` | `assignee_id` muda (create/update card) | novo assignee |
| `task_due_soon` | cron diario | assignee |
| `task_overdue` | cron diario | assignee |
| `project_created` | `create_board` | membros org (exc. criador) |
| `schedule_created` | `schedule_card_to_day` | assignee do card |

### Cron
`GET /api/cron/due-notifications` — header `Authorization: Bearer $CRON_SECRET`.
Cards: `due_date` <= now+3d, sem `completed_at`, com `assignee_id`.

### Codigo
- `apps/web/lib/email/resend-client.ts`, `send-notification.ts`, `templates/*`
- `apps/web/lib/email/notify-events.ts`
- Integracao: `card-actions.ts`, `boards/actions.ts`, `plan/actions.ts`

### Criterios de aceite
- Email fire-and-forget (nao bloqueia server action).
- Dedupe: segundo envio do mesmo evento/entity/recipient nao reenvia.
- `notification_log` sem policy para `authenticated` (pgTAP).
