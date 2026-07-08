-- E.2 fix: table had RLS policies but no GRANT for authenticated (PostgREST SELECT failed).

grant select, insert, update, delete on public.card_workload_allocations to authenticated;
grant select, insert, update, delete on public.org_teams_integrations to authenticated;
grant select, insert, update, delete on public.teams_export_mappings to authenticated;
