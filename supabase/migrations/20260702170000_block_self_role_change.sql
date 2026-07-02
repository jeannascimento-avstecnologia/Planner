-- Bloqueia qualquer membro de alterar o proprio papel org (inclusive owner/gerente)
create or replace function public.update_membership_role(
  p_org uuid,
  p_user uuid,
  p_role public.membership_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.membership_role;
  v_multi boolean;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_user = v_uid then
    raise exception 'cannot_change_own_role';
  end if;

  select multi_owner_enabled into v_multi from public.organizations where id = p_org;
  if not found then
    raise exception 'org_not_found';
  end if;

  select role into v_current from public.memberships where org_id = p_org and user_id = p_user;
  if not found then
    raise exception 'member_not_found';
  end if;

  if p_role = 'owner'::public.membership_role then
    if not coalesce(v_multi, false) then
      raise exception 'cannot_assign_owner_directly';
    end if;
    if not app.is_org_owner(p_org) then
      raise exception 'forbidden';
    end if;
    if v_current = 'owner'::public.membership_role then
      return;
    end if;
    update public.memberships set role = 'owner'::public.membership_role
    where org_id = p_org and user_id = p_user;
    return;
  end if;

  if v_current = 'owner'::public.membership_role then
    if not coalesce(v_multi, false) then
      raise exception 'cannot_change_owner_role';
    end if;
    if not app.is_org_owner(p_org) then
      raise exception 'forbidden';
    end if;
    if app.org_owner_count(p_org) <= 1 then
      raise exception 'last_owner_cannot_demote';
    end if;
  elsif not app.can_manage_org_members(p_org) then
    raise exception 'forbidden';
  end if;

  update public.memberships set role = p_role where org_id = p_org and user_id = p_user;
end;
$$;
