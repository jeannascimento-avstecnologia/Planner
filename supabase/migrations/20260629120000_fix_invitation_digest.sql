-- Fix: digest() requer schema extensions quando search_path = ''
create or replace function public.accept_board_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations%rowtype;
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select email into v_email from auth.users where id = v_uid;
  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    raise exception 'invalid or expired invitation';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'email mismatch';
  end if;

  select coalesce(full_name, v_email) into v_name from public.profiles where id = v_uid;

  insert into public.notifications (org_id, user_id, type, title, body, entity_type, entity_id, board_id)
  select v_inv.org_id, bm.user_id, 'member_added',
         'Novo membro no projeto',
         coalesce(v_name, 'Alguem') || ' entrou no projeto',
         'board', v_inv.board_id, v_inv.board_id
  from public.board_members bm
  where bm.board_id = v_inv.board_id and bm.user_id <> v_uid;

  insert into public.board_members (board_id, user_id, role)
  values (v_inv.board_id, v_uid, v_inv.role)
  on conflict (board_id, user_id) do update set role = excluded.role;
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.board_id;
end;
$$;

create or replace function public.get_ical_feed_cards(p_token text)
returns table (id uuid, title text, due_date timestamptz, board_name text)
language plpgsql security definer set search_path = '' as $$
declare
  v_t public.ical_feed_tokens%rowtype;
begin
  select * into v_t from public.ical_feed_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then return; end if;
  return query
  select c.id, c.title, c.due_date, b.name
  from public.cards c
  join public.boards b on b.id = c.board_id
  where c.org_id = v_t.org_id
    and c.due_date is not null
    and c.completed_at is null
    and (v_t.board_id is null or c.board_id = v_t.board_id);
end;
$$;
