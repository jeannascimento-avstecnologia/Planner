-- B: Yjs document persistence

create table if not exists public.yjs_documents (
  doc_id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  state bytea not null default '\x'::bytea,
  updated_at timestamptz not null default now()
);

alter table public.yjs_documents enable row level security;

create policy yjs_docs_select on public.yjs_documents
  for select using (board_id is null or app.can_access_board(board_id));

create policy yjs_docs_write on public.yjs_documents
  for all using (board_id is not null and app.can_write_board(board_id))
  with check (board_id is not null and app.can_write_board(board_id));

grant select, insert, update on public.yjs_documents to authenticated;

create or replace function public.upsert_yjs_document(p_doc_id text, p_board_id uuid, p_state bytea)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not app.can_write_board(p_board_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select org_id into v_org from public.boards where id = p_board_id;
  insert into public.yjs_documents (doc_id, org_id, board_id, state, updated_at)
  values (p_doc_id, v_org, p_board_id, p_state, now())
  on conflict (doc_id) do update set state = excluded.state, updated_at = now();
end;
$$;

grant execute on function public.upsert_yjs_document(text, uuid, bytea) to authenticated;
