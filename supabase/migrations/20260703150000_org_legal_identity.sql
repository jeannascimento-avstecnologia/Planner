-- 20260703150000 - Identidade org: razao social (legal_name) + CNPJ

alter table public.organizations
  add column if not exists legal_name text,
  add column if not exists cnpj text;

comment on column public.organizations.legal_name is 'Razao social / nome juridico da empresa';
comment on column public.organizations.cnpj is 'CNPJ digits-only (14)';

create or replace function public.update_organization(
  p_org uuid,
  p_name text,
  p_slug text,
  p_legal_name text default null,
  p_cnpj text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
  v_cnpj text;
begin
  if not app.is_org_owner(p_org) then
    raise exception 'forbidden';
  end if;

  v_cnpj := nullif(regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g'), '');

  update public.organizations
  set
    name = p_name,
    slug = p_slug,
    legal_name = nullif(trim(p_legal_name), ''),
    cnpj = v_cnpj
  where id = p_org
  returning * into v_org;

  if not found then
    raise exception 'org_not_found';
  end if;

  return v_org;
end;
$$;

create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_legal_name text default null,
  p_cnpj text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
  v_uid uuid;
  v_cnpj text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_cnpj := nullif(regexp_replace(coalesce(p_cnpj, ''), '[^0-9]', '', 'g'), '');

  insert into public.organizations (name, slug, legal_name, cnpj)
  values (p_name, p_slug, nullif(trim(p_legal_name), ''), v_cnpj)
  returning * into v_org;

  insert into public.memberships (org_id, user_id, role)
  values (v_org.id, v_uid, 'owner');

  return v_org;
end;
$$;
