-- A: execute automation action RPC

create or replace function app.execute_automation_action(
  p_rule_id uuid,
  p_card_id uuid,
  p_action jsonb,
  p_depth int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_type text := p_action->>'type';
  v_result jsonb := '{}'::jsonb;
begin
  if p_depth >= 3 then
    return jsonb_build_object('skipped', 'max_depth');
  end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then return jsonb_build_object('error', 'card_not_found'); end if;

  case v_type
    when 'set_field' then
      perform public.update_card_fields(p_card_id, p_action->'patch');
    when 'move_to_column' then
      update public.cards set column_id = (p_action->>'column_id')::uuid, updated_at = now() where id = p_card_id;
    when 'assign_user' then
      update public.cards set assignee_id = nullif(p_action->>'user_id','')::uuid, updated_at = now() where id = p_card_id;
    else
      v_result := jsonb_build_object('skipped', v_type);
  end case;

  return v_result;
end;
$$;

revoke all on function app.execute_automation_action(uuid, uuid, jsonb, int) from public;
grant execute on function app.execute_automation_action(uuid, uuid, jsonb, int) to service_role;

create or replace function public.execute_automation_action(
  p_rule_id uuid,
  p_card_id uuid,
  p_action jsonb,
  p_depth int default 0
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app.execute_automation_action(p_rule_id, p_card_id, p_action, p_depth);
$$;

grant execute on function public.execute_automation_action(uuid, uuid, jsonb, int) to service_role;
