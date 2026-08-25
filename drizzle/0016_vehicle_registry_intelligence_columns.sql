-- AutoPonte CRM · Vehicle registry fields required by the intelligence pipeline.
-- Additive and idempotent: existing rows receive conservative schema defaults.

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS transmission text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS body_type text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS doors integer NOT NULL DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS engine text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS power text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS renavam text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS registration_state text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS document_status text NOT NULL DEFAULT 'regular';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_condition text NOT NULL DEFAULT 'good';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS inspection_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS acquisition_date text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS listing_date text NOT NULL DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS optional_items text NOT NULL DEFAULT '';
