-- Resolve status do convite (inclui ja aceito) para redirect em /invite
create or replace function public.resolve_board_invitation(p_token text)
returns table (status text, board_id uuid, email text)
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations%rowtype;
  v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
begin
  select * into v_inv from public.invitations where token_hash = v_hash;
  if not found then
    status := 'not_found';
    return next;
    return;
  end if;

  email := v_inv.email;
  board_id := v_inv.board_id;

  if v_inv.accepted_at is not null then
    status := 'accepted';
    return next;
    return;
  end if;

  if v_inv.expires_at <= now() then
    status := 'expired';
    return next;
    return;
  end if;

  status := 'pending';
  return next;
end;
$$;

grant execute on function public.resolve_board_invitation(text) to anon, authenticated;
