-- D: anti-ciclo em card_dependencies

create or replace function app.assert_no_dependency_cycle(p_blocker uuid, p_blocked uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_found uuid;
begin
  if p_blocker = p_blocked then
    raise exception 'dependency_cycle' using errcode = 'P0001';
  end if;
  with recursive walk(id) as (
    select p_blocked
    union
    select cd.blocked_card_id
    from public.card_dependencies cd
    join walk w on cd.blocker_card_id = w.id
  )
  select id into v_found from walk where id = p_blocker limit 1;
  if v_found is not null then
    raise exception 'dependency_cycle' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function app.card_dependencies_cycle_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform app.assert_no_dependency_cycle(NEW.blocker_card_id, NEW.blocked_card_id);
  return NEW;
end;
$$;

drop trigger if exists card_dependencies_cycle on public.card_dependencies;
create trigger card_dependencies_cycle
  before insert or update on public.card_dependencies
  for each row execute function app.card_dependencies_cycle_guard();
