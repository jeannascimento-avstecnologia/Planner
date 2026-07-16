-- P0: atomic outbox claim for automation-runner (FOR UPDATE SKIP LOCKED)

create or replace function public.claim_automation_outbox(p_limit int default 25)
returns setof public.automation_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 then
    p_limit := 25;
  end if;
  if p_limit > 100 then
    p_limit := 100;
  end if;

  return query
  with picked as (
    select o.id
    from public.automation_outbox o
    where o.status in ('pending', 'failed')
      and o.attempts < 5
      and o.next_attempt_at <= now()
    order by o.created_at asc
    limit p_limit
    for update of o skip locked
  )
  update public.automation_outbox dest
  set
    status = 'processing',
    updated_at = now()
  from picked
  where dest.id = picked.id
  returning dest.*;
end;
$$;

revoke all on function public.claim_automation_outbox(int) from public, anon, authenticated;
grant execute on function public.claim_automation_outbox(int) to service_role;

comment on function public.claim_automation_outbox(int) is
  'Atomic per-row claim for automation-runner. Marks pending/failed as processing with SKIP LOCKED.';
