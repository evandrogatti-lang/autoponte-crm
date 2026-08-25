-- Bind each provenance record to the exact vehicle field value it supports.
-- Existing rows remain explicitly unbound until a verified capture rewrites them.
begin;

alter table public.vehicle_data_provenance
  add column if not exists value_hash text not null default '';

commit;
