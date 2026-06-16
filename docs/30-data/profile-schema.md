# Profile — campos estendidos

## Contexto
Pagina de perfil com informacoes adicionais do usuario.

## Requisitos
- `profiles.avatar_url` (ja existe) — URL da foto (Cloudinary `secure_url` em producao).
- `profiles.backup_email` (text, nullable).
- `profiles.phone` (text, nullable).
- `profiles.locale` (text, not null, default `'pt-BR'`) — `pt-BR` | `en-US`.
- Perfil e user-scoped (sem `org_id`): 1:1 com `auth.users`. Excecao documentada a regra de `org_id`.

## Seguranca
- RLS existente (`profiles_update` / `profiles_select`) cobre as colunas novas.
- Upload de avatar: assinatura server-side via Edge Function `supabase/functions/cloudinary-sign` (segredo `CLOUDINARY_API_SECRET` nunca no cliente).
- Fallback sem Cloudinary configurado: campo de URL do avatar.

## Criterios de aceite
- Usuario edita os proprios campos; nao edita de terceiros (RLS ja testada em 00_rls).
- `/profile` salva e reflete os dados.

## Matriz Spec -> Codigo -> Teste
- `supabase/migrations/0006_profile_extended.sql`
- `apps/web/app/(app)/profile/page.tsx`, `profile-form.tsx`, `actions.ts`
- `supabase/functions/cloudinary-sign/index.ts`
- E2E: `apps/web/e2e/ux-refinements.spec.ts` (perfil salva)
