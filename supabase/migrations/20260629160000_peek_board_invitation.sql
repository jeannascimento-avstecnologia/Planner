-- Metadados do convite para signup/login (quem tem o token pode ver email + projeto)
create or replace function public.peek_board_invitation(p_token text)
returns table (email text, board_name text)
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations%rowtype;
  v_board_name text;
begin
  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    return;
  end if;
  select name into v_board_name from public.boards where id = v_inv.board_id;
  email := v_inv.email;
  board_name := coalesce(v_board_name, 'projeto');
  return next;
end;
$$;

grant execute on function public.peek_board_invitation(text) to anon, authenticated;
