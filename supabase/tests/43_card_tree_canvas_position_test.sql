-- pgTAP: tree_x / tree_y clamp helpers
begin;
select plan(4);

select has_column('public', 'cards', 'tree_x', 'cards.tree_x exists');
select has_column('public', 'cards', 'tree_y', 'cards.tree_y exists');

select is(
  app.clamp_tree_coord(1000000000::numeric),
  1000000::numeric,
  'clamp upper bound 1e6'
);

select is(
  app.clamp_tree_coord((-2000000)::numeric),
  (-1000000)::numeric,
  'clamp lower bound -1e6'
);

select * from finish();
rollback;
