-- =====================================================================
-- 0006 - Profile estendido: backup_email, phone, locale
-- (avatar_url ja existe em 0001). Perfil e user-scoped (sem org_id).
-- RLS profiles_select/profiles_update (0001) cobrem as colunas novas.
-- =====================================================================

alter table public.profiles
  add column if not exists backup_email text,
  add column if not exists phone text,
  add column if not exists locale text not null default 'pt-BR';
