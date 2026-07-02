# Multi-tenancy e Seguranca

## Modelo
Shared database / shared schema. Toda tabela de dados de tenant carrega `org_id` (FK -> organizations) com indice e policy RLS de isolamento.

## Identidade e claims
- Supabase Auth (email/senha + Google OAuth). Ver [google-oauth.md](google-oauth.md).
- Custom Access Token Hook injeta no JWT: `org_ids` (uuid[]) e `roles` por org -> RLS le do token, evitando JOIN recursivo por linha.
- `profiles` 1:1 com `auth.users`; `memberships(user_id, org_id, role)` define RBAC (`owner` | `admin` | `manager` | `viewer`). Ver [ADR-0006](ADR-0006-org-owner-role.md).
- JWT claims: `org_ids`, `org_roles`, `org_owners` via `custom_access_token_hook`.

## RLS (regras)
- SELECT/INSERT/UPDATE/DELETE restritos a `org_id in auth_org_ids()`.
- Boards compartilhados: checagem adicional em `board_members` (ACL por board).
- Escrita exige role apropriada (viewer = somente leitura).
- Helper `SECURITY DEFINER` para checagens de membership (evita recursao).
- Otimizacao: `(select auth.uid())` para habilitar initplan cache.

## Segredos
- Service role e secrets (Cloudinary, VAPID) SOMENTE em Edge Functions / server.
- Cliente recebe apenas ANON key + chaves publicas.
- Upload Cloudinary sempre assinado por Edge Function; persistir `public_id` + metadata.

## Auditoria
- `card_events` (append-only) cobre trilha de mudancas de card (base do audit log fast-follow).

## Criterios de Aceite
- Teste pgTAP prova que usuario de org A nao le/escreve dados de org B.
- Viewer nao consegue INSERT/UPDATE/DELETE.
