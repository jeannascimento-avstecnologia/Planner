-- =====================================================================
-- 20260702140000 - delete_organization RPC (owner only)
-- =====================================================================

create or replace function public.delete_organization(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = v_uid
      and m.role = 'owner'::public.membership_role
  ) then
    raise exception 'forbidden';
  end if;

  delete from public.organizations where id = p_org;
  if not found then
    raise exception 'org_not_found';
  end if;
end;
$$;

grant execute on function public.delete_organization(uuid) to authenticated;
