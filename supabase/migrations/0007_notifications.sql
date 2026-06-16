-- =====================================================================
-- 0007 - Notificacoes in-app (MVP): inbox + geradores SECURITY DEFINER
-- INSERT direto negado ao cliente; criacao apenas via funcoes definer.
-- =====================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,                 -- deadline_soon | member_added | card_created
  title text not null,
  body text,
  entity_type text,                   -- 'card' | 'board'
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_org_idx on public.notifications(org_id);

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- sem policy de INSERT/DELETE: apenas funcoes SECURITY DEFINER criam linhas.

grant select, update on public.notifications to authenticated;

-- ---------- gerador: notifica demais membros do board (exclui o ator) ----------
create or replace function public.notify_board(
  p_board uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select org_id into v_org from public.boards where id = p_board;
  if v_org is null then return; end if;
  if not app.can_access_board(p_board) then raise exception 'forbidden'; end if;

  insert into public.notifications (org_id, user_id, type, title, body, entity_type, entity_id)
  select v_org, bm.user_id, p_type, p_title, p_body, p_entity_type, p_entity_id
  from public.board_members bm
  where bm.board_id = p_board and bm.user_id <> v_uid;
end;
$$;

grant execute on function public.notify_board(uuid, text, text, text, text, uuid) to authenticated;

-- ---------- gerador: prazos proximos para o usuario atual (idempotente) ----------
create or replace function public.sync_deadline_notifications()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer := 0;
begin
  if v_uid is null then return 0; end if;

  with due as (
    select c.id, c.org_id, c.title, c.due_date
    from public.cards c
    where c.completed_at is null
      and c.due_date is not null
      and c.due_date >= now()
      and c.due_date <= now() + interval '3 days'
      and app.can_access_board(c.board_id)
  ), ins as (
    insert into public.notifications (org_id, user_id, type, title, body, entity_type, entity_id)
    select d.org_id, v_uid, 'deadline_soon',
           'Prazo se aproximando',
           d.title || ' vence ' || to_char(d.due_date, 'DD/MM'),
           'card', d.id
    from due d
    where not exists (
      select 1 from public.notifications n
      where n.user_id = v_uid and n.type = 'deadline_soon'
        and n.entity_id = d.id
        and n.created_at > now() - interval '2 days'
    )
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;

grant execute on function public.sync_deadline_notifications() to authenticated;

-- ---------- accept_board_invitation: notifica membros existentes (member_added) ----------
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
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    raise exception 'invalid or expired invitation';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'email mismatch';
  end if;

  select coalesce(full_name, v_email) into v_name from public.profiles where id = v_uid;

  -- notifica membros existentes ANTES de adicionar o novo
  insert into public.notifications (org_id, user_id, type, title, body, entity_type, entity_id)
  select v_inv.org_id, bm.user_id, 'member_added',
         'Novo membro no projeto',
         coalesce(v_name, 'Alguem') || ' entrou no projeto',
         'board', v_inv.board_id
  from public.board_members bm
  where bm.board_id = v_inv.board_id and bm.user_id <> v_uid;

  insert into public.board_members (board_id, user_id, role)
  values (v_inv.board_id, v_uid, v_inv.role)
  on conflict (board_id, user_id) do update set role = excluded.role;
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.board_id;
end;
$$;
