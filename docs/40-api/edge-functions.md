# API / Edge Functions (Deno)

Unico lugar com service role / secrets. Contratos validados com Zod.

## Funcoes (alvo)
| Funcao | Quando | Entrada | Saida |
|---|---|---|---|
| `cloudinary-sign` | upload assinado (avatar/logo/anexo) | `{ orgId, purpose?, cardId? }` (auth) — **sem** `folder` livre | `{ timestamp, signature, folder, apiKey, cloudName }` |
| `sign-upload` | upload de anexo (S4) | `{ cardId }` (auth) | `{ timestamp, signature, folder, apiKey, cloudName }` |
| `ical-feed` | feed de prazos (S4) | token assinado na URL | `text/calendar` (.ics) read-only |
| `notify-digest` | cron (S5) | scheduled | envia digests/Web Push respeitando DND |
| `cloudinary-webhook` | pos-upload (S4) | payload Cloudinary | atualiza `attachments` |

## cloudinary-sign (P3.3)
- Auth: Bearer user JWT + `getUser()` + membership em `orgId`.
- `purpose=logo` exige admin/owner; folder = `org/{orgId}/logos`.
- `purpose=avatar` → `org/{orgId}/avatars`; `card` → `org/{orgId}/card/{cardId}`; default → `org/{orgId}/uploads`.
- Cliente **não** envia `folder` arbitrário (`folder_not_allowed`).
- Matriz auth: `docs/40-api/edge-auth-matrix.md`.

## sign-upload (resumo)
- Verifica sessao + acesso ao card (RLS via supabase-js do usuario).
- Assina com `CLOUDINARY_API_SECRET` (server only); `folder = org/{orgId}/card/{cardId}`.
- Cliente faz upload direto -> Cloudinary; persistimos `public_id` + metadata.

## Auth Hook (Postgres function, nao Edge)
`app.custom_access_token_hook(event jsonb)` injeta `org_ids` e `roles` no JWT. Registrado em `supabase/config.toml`.

## Padroes
- Sempre validar payload (Zod) + retornar erro tipado (`error-catalog`).
- Rate limit via Upstash (`ratelimit:{userId}:{fn}`).
