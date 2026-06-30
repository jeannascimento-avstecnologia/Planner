-- Campos de valorização Tiflux + rastreio pre-apontamento vs apontamento final
alter table public.time_entries add column if not exists tiflux_pre_appointment_id text;
alter table public.time_entries add column if not exists tiflux_remote_kind text;
alter table public.time_entries add column if not exists tiflux_attendance_type text;
alter table public.time_entries add column if not exists tiflux_attendance_kind text;
alter table public.time_entries add column if not exists tiflux_loose_service_id text;
alter table public.time_entries add column if not exists tiflux_contract_id text;
