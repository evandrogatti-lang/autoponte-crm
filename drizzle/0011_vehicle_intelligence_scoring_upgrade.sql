-- Vehicle Intelligence Scoring 4A upgrade. Do not apply to Production without approval.
-- Evolves the Vehicle Intelligence Core schema created by 0010_vehicle_intelligence_core.sql.
begin;

alter table public.vehicle_scores
  add column if not exists confidence integer not null default 0 check (confidence between 0 and 100),
  add column if not exists status text not null default 'INSUFFICIENT_DATA' check (status in ('INSUFFICIENT_DATA', 'PROVISIONAL', 'RELIABLE', 'VERIFIED')),
  add column if not exists calculator_version text not null default 'legacy',
  add column if not exists components jsonb not null default '[]'::jsonb,
  add column if not exists reason_codes jsonb not null default '[]'::jsonb,
  add column if not exists input_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists evidence_summary jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

-- Preserve the legacy breakdown text and allow immutable calculation snapshots per version.
alter table public.vehicle_scores drop constraint if exists vehicle_scores_vehicle_id_score_type_key;
create unique index if not exists vehicle_scores_vehicle_type_version_calculated_unique
  on public.vehicle_scores(vehicle_id, score_type, version, calculated_at);
create index if not exists vehicle_scores_vehicle_calculated_idx
  on public.vehicle_scores(vehicle_id, calculated_at desc);

create table if not exists public.vehicle_data_provenance (
  id text primary key,
  vehicle_id text not null references public.vehicles(id) on delete cascade,
  field_name text not null,
  source text not null check (source in ('manual', 'fipe', 'manufacturer', 'document', 'inspection', 'partner', 'ai_inferred', 'photo_ai', 'legacy_migration', 'system')),
  confidence integer not null check (confidence between 0 and 100),
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vehicle_id, field_name)
);
create index if not exists vehicle_data_provenance_vehicle_idx on public.vehicle_data_provenance(vehicle_id);

commit;
