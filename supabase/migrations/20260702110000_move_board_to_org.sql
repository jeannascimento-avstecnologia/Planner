-- =====================================================================
-- 20260702110000 - move_board_to_org RPC
-- =====================================================================

create or replace function public.move_board_to_org(p_board uuid, p_target_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_source_org uuid;
  v_updated int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select org_id into v_source_org from public.boards where id = p_board;
  if not found then
    raise exception 'board_not_found';
  end if;

  if v_source_org = p_target_org then
    raise exception 'same_org';
  end if;

  if not app.has_org_role(v_source_org, array['admin']) then
    raise exception 'forbidden_source';
  end if;

  if not app.has_org_role(p_target_org, array['admin']) then
    raise exception 'forbidden_target';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_board::text));

  update public.boards set org_id = p_target_org where id = p_board;

  update public.columns set org_id = p_target_org where board_id = p_board;
  update public.stages set org_id = p_target_org where board_id = p_board;
  update public.cards set org_id = p_target_org where board_id = p_board;
  update public.tags set org_id = p_target_org where board_id = p_board;

  update public.card_tags ct
  set org_id = p_target_org
  from public.cards c
  where c.id = ct.card_id and c.board_id = p_board;

  update public.card_dependencies cd
  set org_id = p_target_org
  where cd.blocker_card_id in (select id from public.cards where board_id = p_board)
     or cd.blocked_card_id in (select id from public.cards where board_id = p_board);

  update public.card_events set org_id = p_target_org where board_id = p_board;

  update public.invitations set org_id = p_target_org where board_id = p_board;

  update public.notifications set org_id = p_target_org where board_id = p_board;

  update public.ical_feed_tokens set org_id = p_target_org where board_id = p_board;

  select count(*) into v_updated from public.cards where board_id = p_board and org_id <> p_target_org;
  if v_updated > 0 then
    raise exception 'cascade_incomplete';
  end if;
end;
$$;

grant execute on function public.move_board_to_org(uuid, uuid) to authenticated;
