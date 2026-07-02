-- =====================================================================
-- 20260702101000 - Org management: owner backfill, invitations, RPCs
-- =====================================================================

-- owner herda permissoes de admin nas policies existentes
create or replace function app.has_org_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org
      and m.user_id = (select auth.uid())
      and (
        m.role::text = any(p_roles)
        or (m.role = 'owner'::public.membership_role and 'admin' = any(p_roles))
      )
  );
$$;

-- backfill: primeiro admin por org vira owner (se ainda nao houver owner)
update public.memberships m
set role = 'owner'
from (
  select distinct on (org_id) id
  from public.memberships
  where role = 'admin'::public.membership_role
  order by org_id, created_at asc
) first_admin
where m.id = first_admin.id
  and not exists (
    select 1 from public.memberships o
    where o.org_id = m.org_id and o.role = 'owner'::public.membership_role
  );

create unique index if not exists memberships_one_owner_per_org
  on public.memberships (org_id)
  where role = 'owner'::public.membership_role;

-- create_organization: criador vira owner
create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_org public.organizations;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.organizations (name, slug) values (p_name, p_slug) returning * into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org.id, v_user, 'owner');
  return v_org;
end;
$$;

-- JWT: org_owners claim
create or replace function app.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (event->>'user_id')::uuid;
  v_claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  v_orgs jsonb;
  v_roles jsonb;
  v_owners jsonb;
begin
  select coalesce(jsonb_agg(distinct m.org_id), '[]'::jsonb)
    into v_orgs from public.memberships m where m.user_id = v_user;
  select coalesce(jsonb_object_agg(m.org_id, m.role), '{}'::jsonb)
    into v_roles from public.memberships m where m.user_id = v_user;
  select coalesce(jsonb_agg(distinct m.org_id), '[]'::jsonb)
    into v_owners from public.memberships m where m.user_id = v_user and m.role = 'owner'::public.membership_role;
  v_claims := jsonb_set(v_claims, '{org_ids}', v_orgs);
  v_claims := jsonb_set(v_claims, '{org_roles}', v_roles);
  v_claims := jsonb_set(v_claims, '{org_owners}', v_owners);
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- ---------- organization_invitations ----------
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.membership_role not null default 'viewer',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_invitations_role_not_owner check (role <> 'owner'::public.membership_role)
);

create index if not exists organization_invitations_org_idx on public.organization_invitations(org_id);
create index if not exists organization_invitations_token_hash_idx on public.organization_invitations(token_hash);
create index if not exists organization_invitations_email_org_idx on public.organization_invitations(org_id, lower(trim(email)));

alter table public.organization_invitations enable row level security;

create policy organization_invitations_select on public.organization_invitations
  for select using (app.has_org_role(org_id, array['admin']));

create policy organization_invitations_write on public.organization_invitations
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

grant select, insert, update, delete on public.organization_invitations to authenticated;

-- ---------- RPCs ----------
create or replace function public.list_org_members(p_org uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  role public.membership_role,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_org_member(p_org) then
    raise exception 'forbidden';
  end if;
  return query
  select p.id, p.full_name, p.avatar_url, m.role, m.created_at
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.org_id = p_org
  order by m.created_at asc;
end;
$$;

create or replace function public.update_membership_role(
  p_org uuid,
  p_user uuid,
  p_role public.membership_role
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_current public.membership_role;
begin
  if not app.has_org_role(p_org, array['admin']) then
    raise exception 'forbidden';
  end if;
  if p_role = 'owner'::public.membership_role then
    raise exception 'cannot_assign_owner_directly';
  end if;
  select role into v_current from public.memberships where org_id = p_org and user_id = p_user;
  if not found then
    raise exception 'member_not_found';
  end if;
  if v_current = 'owner'::public.membership_role then
    raise exception 'cannot_change_owner_role';
  end if;
  update public.memberships set role = p_role where org_id = p_org and user_id = p_user;
end;
$$;

create or replace function public.remove_org_member(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role public.membership_role;
begin
  if not app.has_org_role(p_org, array['admin']) then
    raise exception 'forbidden';
  end if;
  select role into v_role from public.memberships where org_id = p_org and user_id = p_user;
  if not found then
    raise exception 'member_not_found';
  end if;
  if v_role = 'owner'::public.membership_role then
    raise exception 'cannot_remove_owner';
  end if;
  delete from public.memberships where org_id = p_org and user_id = p_user;
end;
$$;

create or replace function public.leave_organization(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role public.membership_role;
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
    raise exception 'owner_cannot_leave';
  end if;
  delete from public.memberships where org_id = p_org and user_id = v_uid;
end;
$$;

create or replace function public.transfer_org_ownership(p_org uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_current_owner uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select user_id into v_current_owner
  from public.memberships
  where org_id = p_org and role = 'owner'::public.membership_role
  limit 1;
  if v_current_owner is distinct from v_uid then
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

create or replace function public.update_organization(p_org uuid, p_name text, p_slug text)
returns public.organizations language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organizations;
begin
  if not app.has_org_role(p_org, array['admin']) then
    raise exception 'forbidden';
  end if;
  update public.organizations
  set name = trim(p_name), slug = trim(p_slug)
  where id = p_org
  returning * into v_org;
  if not found then
    raise exception 'org_not_found';
  end if;
  return v_org;
end;
$$;

create or replace function public.resolve_org_invitation(p_token text)
returns table (status text, org_id uuid, email text, role public.membership_role)
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.organization_invitations%rowtype;
  v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
begin
  select * into v_inv from public.organization_invitations where token_hash = v_hash;
  if not found then
    status := 'not_found';
    return next;
    return;
  end if;
  org_id := v_inv.org_id;
  email := v_inv.email;
  role := v_inv.role;
  if v_inv.accepted_at is not null then
    status := 'accepted';
    return next;
    return;
  end if;
  if v_inv.expires_at <= now() then
    status := 'expired';
    return next;
    return;
  end if;
  status := 'pending';
  return next;
end;
$$;

create or replace function public.peek_org_invitation(p_token text)
returns table (email text)
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.organization_invitations%rowtype;
begin
  select * into v_inv from public.organization_invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    return;
  end if;
  email := v_inv.email;
  return next;
end;
$$;

create or replace function public.accept_org_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.organization_invitations%rowtype;
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select coalesce(
    nullif(trim(auth.jwt() ->> 'email'), ''),
    (select trim(email) from auth.users where id = v_uid)
  ) into v_email;

  select * into v_inv from public.organization_invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    raise exception 'invalid or expired invitation';
  end if;
  if lower(trim(v_inv.email)) <> lower(trim(coalesce(v_email, ''))) then
    raise exception 'email mismatch';
  end if;

  insert into public.memberships (org_id, user_id, role)
  values (v_inv.org_id, v_uid, v_inv.role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  update public.organization_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.org_id;
end;
$$;

grant execute on function public.list_org_members(uuid) to authenticated;
grant execute on function public.update_membership_role(uuid, uuid, public.membership_role) to authenticated;
grant execute on function public.remove_org_member(uuid, uuid) to authenticated;
grant execute on function public.leave_organization(uuid) to authenticated;
grant execute on function public.transfer_org_ownership(uuid, uuid) to authenticated;
grant execute on function public.update_organization(uuid, text, text) to authenticated;
grant execute on function public.resolve_org_invitation(text) to anon, authenticated;
grant execute on function public.peek_org_invitation(text) to anon, authenticated;
grant execute on function public.accept_org_invitation(text) to authenticated;
