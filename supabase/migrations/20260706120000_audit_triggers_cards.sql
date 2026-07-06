-- F.1 audit triggers: card scope

create or replace function app.audit_emit_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_fields text[] := array[]::text[];
begin
  if TG_OP = 'INSERT' then
    perform app.emit_event(NEW.org_id, 'card', 'card_created', jsonb_build_object('title', NEW.title, 'column_id', NEW.column_id), NEW.board_id, NEW.id, coalesce(v_actor, NEW.created_by));
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform app.emit_event(OLD.org_id, 'card', 'card_deleted', jsonb_build_object('title', OLD.title), OLD.board_id, OLD.id, v_actor);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    if NEW.column_id is distinct from OLD.column_id then
      perform app.emit_event(NEW.org_id, 'card', 'card_moved', jsonb_build_object('from_column_id', OLD.column_id, 'to_column_id', NEW.column_id), NEW.board_id, NEW.id, v_actor);
    end if;
    if NEW.assignee_id is distinct from OLD.assignee_id then
      perform app.emit_event(NEW.org_id, 'card', 'card_assigned', jsonb_build_object('old_assignee_id', OLD.assignee_id, 'new_assignee_id', NEW.assignee_id), NEW.board_id, NEW.id, v_actor);
    end if;
    if NEW.title is distinct from OLD.title then v_fields := array_append(v_fields, 'title'); end if;
    if NEW.description is distinct from OLD.description then v_fields := array_append(v_fields, 'description'); end if;
    if NEW.due_date is distinct from OLD.due_date then v_fields := array_append(v_fields, 'due_date'); end if;
    if NEW.start_date is distinct from OLD.start_date then v_fields := array_append(v_fields, 'start_date'); end if;
    if NEW.priority is distinct from OLD.priority then v_fields := array_append(v_fields, 'priority'); end if;
    if array_length(v_fields, 1) > 0 then
      perform app.emit_event(NEW.org_id, 'card', 'card_updated', jsonb_build_object('changed_fields', to_jsonb(v_fields)), NEW.board_id, NEW.id, v_actor);
    end if;
    return NEW;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists audit_cards on public.cards;
create trigger audit_cards after insert or update or delete on public.cards
  for each row execute function app.audit_emit_card();
