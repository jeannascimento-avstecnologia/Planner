# Compartilhamento de board

## Fluxo
1. Admin abre modal Compartilhar no board.
2. Informa email + role (viewer | admin).
3. Sistema grava `invitations` com token SHA-256.
4. Convidado acessa `/invite?token=` logado com mesmo email → RPC `accept_board_invitation` → `board_members`.

## RLS
- `can_write_board`: org admin OU board_member role admin.

## Migracao
`supabase/migrations/0004_invitations_and_ical.sql`
