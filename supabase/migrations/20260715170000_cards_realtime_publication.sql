-- P2: Realtime postgres_changes em cards (canal estreito por board_id).
-- REPLICA IDENTITY FULL: filter board_id em DELETE (PK-only não carrega board_id).

alter table public.cards replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cards'
  ) then
    alter publication supabase_realtime add table public.cards;
  end if;
end $$;
