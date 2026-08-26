-- Card comments + URL attachments (MVP Grupo 3)

-- ---------------------------------------------------------------------------
-- card_comments
-- ---------------------------------------------------------------------------
create table public.card_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_comments_content_len check (
    char_length(btrim(content)) >= 1 and char_length(content) <= 5000
  )
);

create index card_comments_card_created_idx
  on public.card_comments (card_id, created_at asc);
create index card_comments_board_idx on public.card_comments (board_id);
create index card_comments_author_idx on public.card_comments (author_id);

create trigger card_comments_set_updated_at
  before update on public.card_comments
  for each row execute function app.set_updated_at();

create or replace function app.assert_card_comment_align()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
begin
  select * into v_card from public.cards where id = new.card_id;
  if not found then
    raise exception 'comment_card_missing' using errcode = 'P0001';
  end if;
  if new.org_id is distinct from v_card.org_id
     or new.board_id is distinct from v_card.board_id then
    raise exception 'comment_card_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger card_comments_align_card
  before insert or update of card_id, org_id, board_id on public.card_comments
  for each row execute function app.assert_card_comment_align();

alter table public.card_comments enable row level security;

create policy card_comments_select on public.card_comments
  for select using (app.can_access_board(board_id));

create policy card_comments_insert on public.card_comments
  for insert with check (
    author_id = (select auth.uid())
    and app.can_access_board(board_id)
    and exists (
      select 1 from public.cards c
      where c.id = card_id
        and c.org_id = org_id
        and c.board_id = board_id
    )
  );

create policy card_comments_update on public.card_comments
  for update using (
    author_id = (select auth.uid())
    and app.can_access_board(board_id)
  )
  with check (
    author_id = (select auth.uid())
    and app.can_access_board(board_id)
    and exists (
      select 1 from public.cards c
      where c.id = card_id
        and c.org_id = org_id
        and c.board_id = board_id
    )
  );

create policy card_comments_delete on public.card_comments
  for delete using (
    author_id = (select auth.uid())
    and app.can_access_board(board_id)
  );

grant select, insert, update, delete on public.card_comments to authenticated;

-- ---------------------------------------------------------------------------
-- card_attachments
-- ---------------------------------------------------------------------------
create table public.card_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  kind text not null default 'url',
  url text not null,
  label text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_attachments_kind_check check (kind in ('url')),
  constraint card_attachments_url_len check (char_length(url) >= 1 and char_length(url) <= 2048)
);

create index card_attachments_card_created_idx
  on public.card_attachments (card_id, created_at asc);
create index card_attachments_board_idx on public.card_attachments (board_id);

create trigger card_attachments_set_updated_at
  before update on public.card_attachments
  for each row execute function app.set_updated_at();

create or replace function app.assert_card_attachment_align()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
begin
  select * into v_card from public.cards where id = new.card_id;
  if not found then
    raise exception 'attachment_card_missing' using errcode = 'P0001';
  end if;
  if new.org_id is distinct from v_card.org_id
     or new.board_id is distinct from v_card.board_id then
    raise exception 'attachment_card_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger card_attachments_align_card
  before insert or update of card_id, org_id, board_id on public.card_attachments
  for each row execute function app.assert_card_attachment_align();

alter table public.card_attachments enable row level security;

create policy card_attachments_select on public.card_attachments
  for select using (app.can_access_board(board_id));

create policy card_attachments_insert on public.card_attachments
  for insert with check (
    created_by = (select auth.uid())
    and app.can_write_board(board_id)
    and exists (
      select 1 from public.cards c
      where c.id = card_id
        and c.org_id = org_id
        and c.board_id = board_id
    )
  );

create policy card_attachments_delete on public.card_attachments
  for delete using (app.can_write_board(board_id));

grant select, insert, delete on public.card_attachments to authenticated;

-- ---------------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------------
create or replace function app.audit_emit_card_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if current_setting('app.audit_skip', true) = '1' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    perform app.emit_event(
      new.org_id,
      'card',
      'card_comment_added',
      jsonb_build_object(
        'card_id', new.card_id,
        'comment_id', new.id,
        'author_id', new.author_id,
        'author_name', app.audit_profile_name(new.author_id)
      ),
      new.board_id,
      new.card_id,
      coalesce(v_actor, new.author_id)
    );
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger card_comments_audit_insert
  after insert on public.card_comments
  for each row execute function app.audit_emit_card_comment();

create or replace function app.audit_emit_card_attachment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if current_setting('app.audit_skip', true) = '1' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    perform app.emit_event(
      new.org_id,
      'card',
      'card_attachment_added',
      jsonb_build_object(
        'card_id', new.card_id,
        'attachment_id', new.id,
        'kind', new.kind,
        'url', new.url,
        'label', new.label
      ),
      new.board_id,
      new.card_id,
      coalesce(v_actor, new.created_by)
    );
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger card_attachments_audit_insert
  after insert on public.card_attachments
  for each row execute function app.audit_emit_card_attachment();
