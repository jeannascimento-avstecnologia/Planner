-- =====================================================================
-- 0001 - Tenancy: organizations, profiles, memberships + RLS + helpers
-- =====================================================================
create extension if not exists pgcrypto;

create schema if not exists app;

-- ---------- enums ----------
do $$ begin
  create type public.membership_role as enum ('admin', 'viewer');
exception when duplicate_object then null; end $$;

-- ---------- utils ----------
create or replace function app.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- tables ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);
create index memberships_org_idx on public.memberships(org_id);

create trigger trg_orgs_updated before update on public.organizations
  for each row execute function app.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function app.set_updated_at();

-- ---------- helpers (SECURITY DEFINER, bypass RLS p/ evitar recursao) ----------
create or replace function app.current_org_ids()
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.org_id), '{}')
  from public.memberships m
  where m.user_id = (select auth.uid());
$$;

create or replace function app.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function app.has_org_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org
      and m.user_id = (select auth.uid())
      and m.role::text = any(p_roles)
  );
$$;

create or replace function app.shares_org(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on a.org_id = b.org_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  );
$$;

-- ---------- onboarding: profile on signup + org RPC ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
  insert into public.memberships (org_id, user_id, role) values (v_org.id, v_user, 'admin');
  return v_org;
end;
$$;

-- ---------- custom access token hook (org_ids/org_roles no JWT) ----------
create or replace function app.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (event->>'user_id')::uuid;
  v_claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  v_orgs jsonb;
  v_roles jsonb;
begin
  select coalesce(jsonb_agg(distinct m.org_id), '[]'::jsonb)
    into v_orgs from public.memberships m where m.user_id = v_user;
  select coalesce(jsonb_object_agg(m.org_id, m.role), '{}'::jsonb)
    into v_roles from public.memberships m where m.user_id = v_user;
  v_claims := jsonb_set(v_claims, '{org_ids}', v_orgs);
  v_claims := jsonb_set(v_claims, '{org_roles}', v_roles);
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- ---------- RLS ----------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

create policy orgs_select on public.organizations
  for select using (app.is_org_member(id));
create policy orgs_update on public.organizations
  for update using (app.has_org_role(id, array['admin']))
  with check (app.has_org_role(id, array['admin']));
create policy orgs_delete on public.organizations
  for delete using (app.has_org_role(id, array['admin']));
-- INSERT direto negado: usar public.create_organization()

create policy profiles_select on public.profiles
  for select using (id = (select auth.uid()) or app.shares_org(id));
create policy profiles_insert on public.profiles
  for insert with check (id = (select auth.uid()));
create policy profiles_update on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy memberships_select on public.memberships
  for select using (app.is_org_member(org_id));
create policy memberships_write on public.memberships
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

-- ---------- grants (RLS continua gateando linhas) ----------
grant usage on schema app to anon, authenticated;
grant execute on function app.current_org_ids() to anon, authenticated;
grant execute on function app.is_org_member(uuid) to anon, authenticated;
grant execute on function app.has_org_role(uuid, text[]) to anon, authenticated;
grant execute on function app.shares_org(uuid) to anon, authenticated;
grant execute on function public.create_organization(text, text) to authenticated;

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;

-- auth hook precisa ler memberships
grant usage on schema app to supabase_auth_admin;
grant execute on function app.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.memberships to supabase_auth_admin;
revoke execute on function app.custom_access_token_hook(jsonb) from anon, authenticated, public;
