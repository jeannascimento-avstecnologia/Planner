begin;
select plan(3);

select has_function('public', 'get_board_dashboard_bundle', array['uuid'], 'dashboard rpc exists');

select ok(
  (select count(*) >= 0 from public.throughput_by_board_week),
  'throughput mv readable'
);

select ok(
  (select count(*) >= 0 from public.cfd_by_board_day),
  'cfd mv readable'
);

select * from finish();
rollback;
