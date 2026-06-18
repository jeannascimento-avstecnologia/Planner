-- =====================================================================
-- 0010 - Adiciona papel manager ao enum (transacao separada do uso em RLS)
-- =====================================================================

ALTER TYPE public.membership_role ADD VALUE IF NOT EXISTS 'manager';
