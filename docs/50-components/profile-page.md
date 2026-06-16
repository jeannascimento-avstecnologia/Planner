# Profile page + Theme + Notifications (shell)

## /profile
- Form: nome, e-mail backup, telefone, idioma (`pt-BR`/`en-US`), foto.
- `updateProfile` server action (RLS: proprio perfil).
- Avatar: uploader assinado (Edge Function) quando `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` setado; senao campo URL.

## Theme toggle
- `ThemeProvider` aplica `data-theme` em `<html>`; persiste `ngp:theme`; default segue `prefers-color-scheme`.
- Botao Sol/Lua no topo da sidebar.

## Notification bell
- Sino na sidebar com badge de nao-lidas.
- Dropdown lista as ultimas; "marcar todas como lidas".
- Tipos MVP: `deadline_soon`, `member_added`, `card_created`.

## Matriz Spec -> Codigo -> Teste
- `components/shell/theme-provider.tsx`, `theme-toggle.tsx`, `notification-bell.tsx`
- `app/(app)/profile/*`, `app/(app)/notifications/actions.ts`
- E2E: tema alterna `data-theme`; sino visivel.
