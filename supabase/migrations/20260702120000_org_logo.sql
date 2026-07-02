-- =====================================================================
-- 20260702120000 - organization logo_url
-- =====================================================================

alter table public.organizations
  add column if not exists logo_url text;

create or replace function public.update_org_logo(p_org uuid, p_logo_url text)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  if not app.has_org_role(p_org, array['admin']) then
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

grant execute on function public.update_org_logo(uuid, text) to authenticated;
