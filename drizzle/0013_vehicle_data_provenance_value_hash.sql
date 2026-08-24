-- Bind each provenance record to the exact vehicle field value it supports.
-- Existing rows remain explicitly unbound until a verified capture rewrites them.
begin;

do $$
begin
  if exists (select 1 from public.vehicle_data_provenance) then
    raise exception '0013 requires vehicle_data_provenance to be empty; audit and bind existing evidence explicitly';
  end if;
end
$$;

alter table public.vehicle_data_provenance
  add column if not exists value_hash text not null default '';

commit;
