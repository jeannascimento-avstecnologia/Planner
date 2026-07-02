-- =====================================================================
-- 20260702100000 - Enum owner (transacao separada)
-- =====================================================================
ALTER TYPE public.membership_role ADD VALUE IF NOT EXISTS 'owner';
