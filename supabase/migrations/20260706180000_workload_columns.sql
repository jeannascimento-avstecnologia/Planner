-- E: workload columns

alter table public.cards
  add column if not exists estimated_hours numeric(5,2),
  add column if not exists story_points int;

alter table public.profiles
  add column if not exists weekly_capacity_hours numeric(5,2) not null default 40;
