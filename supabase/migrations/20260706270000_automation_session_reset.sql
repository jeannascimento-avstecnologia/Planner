-- Fix: reset session vars após execute_automations_for_event

create or replace function private.execute_automations_for_event(p_event_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.card_events%rowtype;
  v_card public.cards%rowtype;
  v_rule record;
  v_action jsonb;
  v_root bigint;
  v_next_depth int;
  v_prev_depth text;
  v_prev_root text;
  v_prev_running text;
begin
  v_prev_depth := coalesce(current_setting('app.automation_depth', true), '');
  v_prev_root := coalesce(current_setting('app.automation_root_event_id', true), '');
  v_prev_running := coalesce(current_setting('app.automation_running', true), '');

  select * into v_event from public.card_events where id = p_event_id;
  if not found then
    return;
  end if;

  if v_event.automation_depth >= 3 then
    raise exception 'automation_depth_exceeded' using errcode = 'P0001';
  end if;

  if v_event.board_id is null or v_event.card_id is null then
    return;
  end if;

  select * into v_card from public.cards where id = v_event.card_id;
  if not found then
    return;
  end if;

  v_root := coalesce(v_event.root_event_id, v_event.id);
  v_next_depth := v_event.automation_depth + 1;

  perform set_config('app.automation_depth', v_next_depth::text, true);
  perform set_config('app.automation_root_event_id', v_root::text, true);
  perform set_config('app.automation_running', '1', true);

  for v_rule in
    select *
    from public.automation_rules r
    where r.board_id = v_event.board_id
      and r.active = true
      and r.trigger_event = v_event.event_type
  loop
    if private.automation_conditions_match(v_rule.conditions, v_event, v_card) then
      for v_action in select jsonb_array_elements(v_rule.actions)
      loop
        perform private.apply_automation_action(v_action, v_card.id);
        select * into v_card from public.cards where id = v_event.card_id;
      end loop;
    end if;
  end loop;

  perform set_config('app.automation_depth', v_prev_depth, true);
  perform set_config('app.automation_root_event_id', v_prev_root, true);
  perform set_config('app.automation_running', v_prev_running, true);
end;
$$;
