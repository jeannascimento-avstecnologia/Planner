-- start_date para visão Gantt (timeline) no board
alter table public.cards add column if not exists start_date timestamptz;

create index if not exists cards_board_dates_idx
  on public.cards (board_id, start_date, due_date);
