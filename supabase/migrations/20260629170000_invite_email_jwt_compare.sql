-- Comparacao de email: JWT + trim (evita falso mismatch auth.users vs sessao)
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

  select coalesce(
    nullif(trim(auth.jwt() ->> 'email'), ''),
    (select trim(email) from auth.users where id = v_uid)
  ) into v_email;

  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    raise exception 'invalid or expired invitation';
  end if;
  if lower(trim(v_inv.email)) <> lower(trim(coalesce(v_email, ''))) then
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
