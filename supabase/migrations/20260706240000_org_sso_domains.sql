-- F.3: SSO domains

create table if not exists public.org_sso_domains (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null,
  unique (domain)
);

alter table public.org_sso_domains enable row level security;

create policy org_sso_domains_select on public.org_sso_domains
  for select using (app.is_org_member(org_id));

create policy org_sso_domains_write on public.org_sso_domains
  for all using (app.has_org_role(org_id, array['owner']))
  with check (app.has_org_role(org_id, array['owner']));

grant select, insert, delete on public.org_sso_domains to authenticated;
