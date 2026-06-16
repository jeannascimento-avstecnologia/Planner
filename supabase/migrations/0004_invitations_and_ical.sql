-- =====================================================================
-- 0004 - Convites de board + tokens de feed iCal
-- =====================================================================

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  email text not null,
  role public.membership_role not null default 'viewer',
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index invitations_board_idx on public.invitations(board_id);
create index invitations_email_idx on public.invitations(email);

create table public.ical_feed_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
create index ical_tokens_user_idx on public.ical_feed_tokens(user_id);

create or replace function public.accept_board_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations%rowtype;
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select email into v_email from auth.users where id = v_uid;
  select * into v_inv from public.invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    raise exception 'invalid or expired invitation';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'email mismatch';
  end if;
  insert into public.board_members (board_id, user_id, role)
  values (v_inv.board_id, v_uid, v_inv.role)
  on conflict (board_id, user_id) do update set role = excluded.role;
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.board_id;
end;
$$;

alter table public.invitations enable row level security;
alter table public.ical_feed_tokens enable row level security;

create policy invitations_select on public.invitations
  for select using (
    app.has_org_role(org_id, array['admin'])
    or lower(email) = lower((select email from auth.users where id = (select auth.uid())))
  );
create policy invitations_write on public.invitations
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

create policy ical_tokens_select on public.ical_feed_tokens
  for select using (user_id = (select auth.uid()));
create policy ical_tokens_write on public.ical_feed_tokens
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant execute on function public.accept_board_invitation(text) to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert, delete on public.ical_feed_tokens to authenticated;

create or replace function public.get_ical_feed_cards(p_token text)
returns table (id uuid, title text, due_date timestamptz, board_name text)
language plpgsql security definer set search_path = '' as $$
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
    and (v_t.board_id is null or c.board_id = v_t.board_id);
end;
$$;

grant execute on function public.get_ical_feed_cards(text) to anon, authenticated;
