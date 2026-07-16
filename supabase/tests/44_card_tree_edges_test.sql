-- pgTAP: card_tree_edges multi-pai + RLS basics
begin;
select plan(6);

-- assumes seed helpers exist from prior tests; minimal inline if needed
select has_table('public', 'card_tree_edges', 'table exists');
select has_index('public', 'card_tree_edges', 'card_tree_edges_unique', 'unique parent+child');

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'card_tree_edges' and policyname = 'card_tree_edges_select'
  ),
  'select policy'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'card_tree_edges' and policyname = 'card_tree_edges_insert'
  ),
  'insert policy'
);

select has_function('app', 'assert_no_tree_edge_cycle', array['uuid','uuid','uuid'], 'cycle guard');
select has_trigger('public', 'card_tree_edges', 'card_tree_edges_bi', 'before insert trigger');

select * from finish();
rollback;
