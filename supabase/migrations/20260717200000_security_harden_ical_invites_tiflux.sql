-- Security harden: iCal access filter, invitations ACL, Tiflux SSRF (api_url)

-- ---------- access check for an arbitrary user (ical feed / jobs) ----------
create or replace function app.can_access_board_as(p_board uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = p_board
      and (
        b.created_by = p_user
        or exists (
          select 1 from public.board_members bm
          where bm.board_id = p_board and bm.user_id = p_user
        )
        or (
          b.department_id is null
          and exists (
            select 1 from public.memberships m
            where m.org_id = b.org_id and m.user_id = p_user
          )
        )
        or (
          b.department_id is not null
          and (
            exists (
              select 1 from public.memberships m
              where m.org_id = b.org_id
                and m.user_id = p_user
                and m.role = 'owner'::public.membership_role
            )
            or exists (
              select 1 from public.department_members dm
              where dm.department_id = b.department_id and dm.user_id = p_user
            )
          )
        )
      )
  );
$$;

grant execute on function app.can_access_board_as(uuid, uuid) to authenticated;

-- iCal: so cards de boards que o dono do token pode acessar
create or replace function public.get_ical_feed_cards(p_token text)
returns table (id uuid, title text, due_date timestamptz, board_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.ical_feed_tokens%rowtype;
begin
  select * into v_t from public.ical_feed_tokens
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  if not found then return; end if;

  return query
  select c.id, c.title, c.due_date, b.name
  from public.cards c
  join public.boards b on b.id = c.board_id
  where c.org_id = v_t.org_id
    and c.due_date is not null
    and c.completed_at is null
    and (v_t.board_id is null or c.board_id = v_t.board_id)
    and app.can_access_board_as(c.board_id, v_t.user_id);
end;
$$;

grant execute on function public.get_ical_feed_cards(text) to anon, authenticated;

-- Invitations: owner OU can_manage_board_members (nao org admin sozinho)
drop policy if exists invitations_write on public.invitations;
create policy invitations_write on public.invitations
  for all using (
    app.is_org_owner(org_id)
    or (board_id is not null and app.can_manage_board_members(board_id))
  )
  with check (
    app.is_org_owner(org_id)
    or (board_id is not null and app.can_manage_board_members(board_id))
  );

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select using (
    app.is_org_owner(org_id)
    or (board_id is not null and app.can_manage_board_members(board_id))
    or lower(email) = lower((select email from auth.users where id = (select auth.uid())))
  );

-- Tiflux: bloquear api_url arbitraria (SSRF). So null ou host allowlist.
create or replace function public.set_board_tiflux_token(
  p_board uuid,
  p_token text,
  p_api_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_key text;
  v_url text;
  v_host text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not app.can_write_board(p_board) then
    raise exception 'forbidden';
  end if;
  if p_token is null or length(trim(p_token)) < 8 then
    raise exception 'invalid_token';
  end if;

  v_url := nullif(trim(p_api_url), '');
  if v_url is not null then
    if v_url !~* '^https://' then
      raise exception 'tiflux_api_url_https_only';
    end if;
    v_host := lower(split_part(regexp_replace(v_url, '^https://', ''), '/', 1));
    if v_host not in ('api.tiflux.com', 'tiflux.com', 'www.tiflux.com') then
      raise exception 'tiflux_api_url_not_allowed';
    end if;
  end if;

  v_key := private.integrations_encryption_key();
  if v_key is null or length(v_key) < 16 then
    raise exception 'integrations_key_not_configured';
  end if;

  select org_id into v_org_id from public.boards where id = p_board;
  if v_org_id is null then
    raise exception 'board_not_found';
  end if;

  insert into public.board_integration_secrets (
    board_id, org_id, tiflux_api_token_encrypted, tiflux_api_url, updated_by
  )
  values (
    p_board,
    v_org_id,
    extensions.pgp_sym_encrypt(trim(p_token), v_key),
    v_url,
    auth.uid()
  )
  on conflict (board_id) do update set
    tiflux_api_token_encrypted = excluded.tiflux_api_token_encrypted,
    tiflux_api_url = excluded.tiflux_api_url,
    updated_at = now(),
    updated_by = excluded.updated_by;

  perform private.set_board_tiflux_configured(p_board, true);
end;
$$;
