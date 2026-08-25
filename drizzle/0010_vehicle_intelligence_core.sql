-- Vehicle Intelligence Core baseline. Safe to apply when legacy tables already exist.
begin;

create table if not exists public.vehicle_scores (
  id text primary key,
  vehicle_id text not null references public.vehicles(id) on delete cascade,
  score_type text not null,
  score integer not null check (score between 0 and 100),
  breakdown text not null default '{}',
  version text not null default 'v1',
  calculated_at timestamptz not null default now(),
  unique(vehicle_id, score_type)
);
create index if not exists vehicle_scores_vehicle_idx on public.vehicle_scores(vehicle_id);

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
