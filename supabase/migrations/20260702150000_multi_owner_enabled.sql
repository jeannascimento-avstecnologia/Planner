-- =====================================================================
-- 20260702150000 - multi_owner_enabled (chave para multiplos proprietarios)
-- =====================================================================

alter table public.organizations
  add column if not exists multi_owner_enabled boolean not null default false;

-- remove constraint de owner unico; enforcement condicional via RPC/trigger
drop index if exists public.memberships_one_owner_per_org;

create or replace function app.is_org_owner(p_org uuid)
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
      and m.user_id = (select auth.uid())
      and m.role = 'owner'::public.membership_role
  );
$$;

grant execute on function app.is_org_owner(uuid) to authenticated;

create or replace function app.org_owner_count(p_org uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.memberships m
  where m.org_id = p_org
    and m.role = 'owner'::public.membership_role;
$$;

grant execute on function app.org_owner_count(uuid) to authenticated;

-- convites como owner so com chave ativa
alter table public.organization_invitations
  drop constraint if exists organization_invitations_role_not_owner;

create or replace function app.validate_org_invitation_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_multi boolean;
begin
  if new.role = 'owner'::public.membership_role then
    select o.multi_owner_enabled into v_multi
    from public.organizations o
    where o.id = new.org_id;
    if not coalesce(v_multi, false) then
      raise exception 'cannot_invite_as_owner';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_org_invitation_role on public.organization_invitations;
create trigger trg_org_invitation_role
  before insert or update of role, org_id on public.organization_invitations
  for each row execute function app.validate_org_invitation_role();

create or replace function public.set_org_multi_owner(p_org uuid, p_enabled boolean)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  if not app.is_org_owner(p_org) then
    raise exception 'forbidden';
  end if;

  if p_enabled = false and app.org_owner_count(p_org) > 1 then
    raise exception 'demote_extra_owners_first';
  end if;

  update public.organizations
  set multi_owner_enabled = p_enabled
  where id = p_org
  returning * into v_org;

  if not found then
    raise exception 'org_not_found';
  end if;

  return v_org;
end;
$$;

grant execute on function public.set_org_multi_owner(uuid, boolean) to authenticated;

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
begin
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
  elsif not app.has_org_role(p_org, array['admin']) then
    raise exception 'forbidden';
  end if;

  update public.memberships set role = p_role where org_id = p_org and user_id = p_user;
end;
$$;

create or replace function public.remove_org_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.membership_role;
  v_multi boolean;
begin
  if not app.has_org_role(p_org, array['admin']) then
    raise exception 'forbidden';
  end if;

  select role into v_role from public.memberships where org_id = p_org and user_id = p_user;
  if not found then
    raise exception 'member_not_found';
  end if;

  if v_role = 'owner'::public.membership_role then
    select multi_owner_enabled into v_multi from public.organizations where id = p_org;
    if not coalesce(v_multi, false) then
      raise exception 'cannot_remove_owner';
    end if;
    if app.org_owner_count(p_org) <= 1 then
      raise exception 'last_owner_cannot_remove';
    end if;
    if not app.is_org_owner(p_org) then
      raise exception 'forbidden';
    end if;
  end if;

  delete from public.memberships where org_id = p_org and user_id = p_user;
end;
$$;

create or replace function public.leave_organization(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.membership_role;
  v_multi boolean;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select role into v_role from public.memberships where org_id = p_org and user_id = v_uid;
  if not found then
    raise exception 'member_not_found';
  end if;

  if v_role = 'owner'::public.membership_role then
    select multi_owner_enabled into v_multi from public.organizations where id = p_org;
    if not coalesce(v_multi, false) then
      raise exception 'owner_cannot_leave';
    end if;
    if app.org_owner_count(p_org) <= 1 then
      raise exception 'last_owner_cannot_leave';
    end if;
  end if;

  delete from public.memberships where org_id = p_org and user_id = v_uid;
end;
$$;

create or replace function public.transfer_org_ownership(p_org uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_multi boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select multi_owner_enabled into v_multi from public.organizations where id = p_org;
  if coalesce(v_multi, false) then
    raise exception 'use_multi_owner_promotion';
  end if;

  if not app.is_org_owner(p_org) then
    raise exception 'forbidden';
  end if;

  if not exists (select 1 from public.memberships where org_id = p_org and user_id = p_new_owner) then
    raise exception 'member_not_found';
  end if;

  if p_new_owner = v_uid then
    raise exception 'already_owner';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_org::text));

  update public.memberships set role = 'admin'::public.membership_role
  where org_id = p_org and user_id = v_uid;

  update public.memberships set role = 'owner'::public.membership_role
  where org_id = p_org and user_id = p_new_owner;
end;
$$;
