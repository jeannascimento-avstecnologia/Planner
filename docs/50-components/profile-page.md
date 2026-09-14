# Profile page + Theme + Notifications (shell)

## /profile
- Form: nome, e-mail backup, telefone, idioma (`pt-BR`/`en-US`), foto.
- Telefone: máscara BR (`(11) 98888-8888` / `(11) 3333-4444`); persiste só dígitos; vazio = `null`.
- E-mail backup: trim/lowercase; erro de campo se inválido (`E-mail de backup inválido`).
- `locale` persiste; UI de datas/números permanece `pt-BR` neste ciclo.
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
