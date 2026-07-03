-- Fix: pgp_sym_* vive em extensions (search_path = '' no RPC)
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
    nullif(trim(p_api_url), ''),
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

create or replace function public.get_board_tiflux_token(p_board uuid)
returns table(token text, api_url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  v_key := private.integrations_encryption_key();
  if v_key is null or length(v_key) < 16 then
    return;
  end if;

  return query
  select
    extensions.pgp_sym_decrypt(s.tiflux_api_token_encrypted, v_key)::text as token,
    coalesce(s.tiflux_api_url, 'https://api.tiflux.com/api/v2') as api_url
  from public.board_integration_secrets s
  where s.board_id = p_board;
end;
$$;
