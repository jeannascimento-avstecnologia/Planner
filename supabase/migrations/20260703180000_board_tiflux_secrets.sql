-- 20260703180000 - Credenciais Tiflux por board (criptografadas)

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.integration_config (
  id int primary key default 1 check (id = 1),
  encryption_key text not null
);

insert into private.integration_config (id, encryption_key)
values (1, 'local-dev-integrations-key-32chars!!')
on conflict (id) do nothing;

create table public.board_integration_secrets (
  board_id uuid primary key references public.boards(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  tiflux_api_token_encrypted bytea not null,
  tiflux_api_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index board_integration_secrets_org_idx on public.board_integration_secrets(org_id);

alter table public.board_integration_secrets enable row level security;

-- Nenhum acesso direto autenticado (token so via RPC service_role)
create policy board_integration_secrets_deny on public.board_integration_secrets
  for all using (false);

create or replace function private.integrations_encryption_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encryption_key from private.integration_config where id = 1;
$$;

create or replace function private.set_board_tiflux_configured(p_board uuid, p_configured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.boards
  set integrations = jsonb_set(
    coalesce(integrations, '{}'::jsonb),
    '{tiflux,configured}',
    to_jsonb(p_configured),
    true
  )
  where id = p_board;
end;
$$;

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

create or replace function public.clear_board_tiflux_token(p_board uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not app.can_write_board(p_board) then
    raise exception 'forbidden';
  end if;

  delete from public.board_integration_secrets where board_id = p_board;
  perform private.set_board_tiflux_configured(p_board, false);
end;
$$;

create or replace function public.board_tiflux_status(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not app.can_access_board(p_board) then false
    else exists (
      select 1
      from public.board_integration_secrets s
      where s.board_id = p_board
    )
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

grant execute on function public.set_board_tiflux_token(uuid, text, text) to authenticated;
grant execute on function public.clear_board_tiflux_token(uuid) to authenticated;
grant execute on function public.board_tiflux_status(uuid) to authenticated;
grant execute on function public.get_board_tiflux_token(uuid) to service_role;
revoke execute on function public.get_board_tiflux_token(uuid) from public, anon, authenticated;
