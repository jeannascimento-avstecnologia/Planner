-- Access presets: so Proprietario (owner) cria/edita/exclui.
-- app.can_manage_org_members permanece owner|admin (convites org / membros).

create or replace function app.can_manage_access_presets(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.role = 'owner'::public.membership_role
  );
$$;

comment on function app.can_manage_access_presets(uuid) is
  'True se o usuario autenticado e owner da org (CRUD presets custom).';
