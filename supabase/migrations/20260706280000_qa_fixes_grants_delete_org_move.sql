-- QA fixes: grants service_role, delete_organization + card_events purge, move_board owner

grant usage on schema app to service_role;
grant select, insert, update, delete on public.card_events to service_role;

create or replace function public.delete_organization(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = v_uid
      and m.role = 'owner'::public.membership_role
  ) then
    raise exception 'forbidden';
  end if;

  perform set_config('app.card_events_purge', '1', true);
  delete from public.card_events where org_id = p_org;
  perform set_config('app.card_events_purge', '0', true);

  delete from public.organizations where id = p_org;
  if not found then
    raise exception 'org_not_found';
  end if;
end;
$$;

create or replace function public.move_board_to_org(p_board uuid, p_target_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  if not app.has_org_role(v_source_org, array['admin', 'owner']) then
    raise exception 'forbidden_source';
  end if;

  if not app.has_org_role(p_target_org, array['admin', 'owner']) then
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
