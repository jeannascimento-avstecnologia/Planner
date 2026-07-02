-- =====================================================================
-- 20260702160000 - RBAC org: owner identidade; gerente convites/roles
-- admin/viewer: somente leitura de membros
-- =====================================================================

create or replace function app.can_manage_org_members(p_org uuid)
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
      and m.role in (
        'owner'::public.membership_role,
        'manager'::public.membership_role
      )
  );
$$;

grant execute on function app.can_manage_org_members(uuid) to authenticated;

-- ---------- organizations RLS: update somente owner ----------
drop policy if exists orgs_update on public.organizations;
create policy orgs_update on public.organizations
  for update using (app.is_org_owner(id))
  with check (app.is_org_owner(id));

-- ---------- memberships RLS: write somente owner/gerente ----------
drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships
  for all using (app.can_manage_org_members(org_id))
  with check (app.can_manage_org_members(org_id));

-- ---------- organization_invitations ----------
drop policy if exists organization_invitations_select on public.organization_invitations;
drop policy if exists organization_invitations_write on public.organization_invitations;

create policy organization_invitations_select on public.organization_invitations
  for select using (app.can_manage_org_members(org_id));

create policy organization_invitations_write on public.organization_invitations
  for all using (app.can_manage_org_members(org_id))
  with check (app.can_manage_org_members(org_id));

-- ---------- update_org_logo: owner only ----------
create or replace function public.update_org_logo(p_org uuid, p_logo_url text)
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

  update public.organizations
  set logo_url = nullif(trim(p_logo_url), '')
  where id = p_org
  returning * into v_org;

  if not found then
    raise exception 'org_not_found';
  end if;

  return v_org;
end;
$$;

-- ---------- update_organization: owner only ----------
create or replace function public.update_organization(p_org uuid, p_name text, p_slug text)
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

  update public.organizations
  set name = p_name, slug = p_slug
  where id = p_org
  returning * into v_org;

  if not found then
    raise exception 'org_not_found';
  end if;

  return v_org;
end;
$$;

-- ---------- update_membership_role: owner/gerente; owner ops = owner ----------
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
  elsif not app.can_manage_org_members(p_org) then
    raise exception 'forbidden';
  end if;

  update public.memberships set role = p_role where org_id = p_org and user_id = p_user;
end;
$$;

-- ---------- remove_org_member: owner/gerente ----------
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
  if not app.can_manage_org_members(p_org) then
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
    if not app.is_org_owner(p_org) then
      raise exception 'forbidden';
    end if;
    if app.org_owner_count(p_org) <= 1 then
      raise exception 'last_owner_cannot_remove';
    end if;
  end if;

  delete from public.memberships where org_id = p_org and user_id = p_user;
end;
$$;

-- ---------- move_board_to_org: owner/gerente nas duas orgs ----------
create or replace function public.move_board_to_org(p_board uuid, p_target_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_source_org uuid;
  v_updated int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select org_id into v_source_org from public.boards where id = p_board;
  if not found then
    raise exception 'board_not_found';
  end if;

  if v_source_org = p_target_org then
    raise exception 'same_org';
  end if;

  if not app.can_manage_org_members(v_source_org) then
    raise exception 'forbidden_source';
  end if;

  if not app.can_manage_org_members(p_target_org) then
    raise exception 'forbidden_target';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_board::text));

  update public.boards set org_id = p_target_org where id = p_board;

  update public.columns set org_id = p_target_org where board_id = p_board;
  update public.stages set org_id = p_target_org where board_id = p_board;
  update public.cards set org_id = p_target_org where board_id = p_board;
  update public.tags set org_id = p_target_org where board_id = p_board;

  update public.card_tags ct
  set org_id = p_target_org
  from public.cards c
  where c.id = ct.card_id and c.board_id = p_board;

  update public.card_dependencies cd
  set org_id = p_target_org
  where cd.blocker_card_id in (select id from public.cards where board_id = p_board)
     or cd.blocked_card_id in (select id from public.cards where board_id = p_board);

  update public.card_events set org_id = p_target_org where board_id = p_board;
  update public.invitations set org_id = p_target_org where board_id = p_board;
  update public.notifications set org_id = p_target_org where board_id = p_board;
  update public.ical_feed_tokens set org_id = p_target_org where board_id = p_board;

  select count(*) into v_updated from public.cards where board_id = p_board and org_id <> p_target_org;
  if v_updated > 0 then
    raise exception 'cascade_incomplete';
  end if;
end;
$$;

-- ---------- storage org-logos: upload owner only ----------
drop policy if exists org_logos_insert on storage.objects;
drop policy if exists org_logos_update on storage.objects;
drop policy if exists org_logos_delete on storage.objects;

create policy org_logos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and app.is_org_owner((storage.foldername(name))[1]::uuid)
  );

create policy org_logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-logos'
    and app.is_org_owner((storage.foldername(name))[1]::uuid)
  );

create policy org_logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and app.is_org_owner((storage.foldername(name))[1]::uuid)
  );
