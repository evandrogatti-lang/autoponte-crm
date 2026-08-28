-- Enforce operational readiness when lifecycle status advances. Existing rows are preserved.
alter table public.vehicles add column if not exists vqi_required boolean not null default false;
create or replace function public.enforce_vehicle_inventory_readiness() returns trigger language plpgsql as $$
begin
  if new.lifecycle_status in ('READY','PUBLISHED','AVAILABLE') and exists (
    select 1 from public.vehicle_work_orders w where w.vehicle_id=new.id and w.status in ('open','in_progress')
  ) then raise exception 'MAINTENANCE_BLOCKED'; end if;
  if new.lifecycle_status in ('PUBLISHED','AVAILABLE') then
    if new.document_status not in ('regular','approved') then raise exception 'DOCUMENT_BLOCKED'; end if;
    if new.vqi_required and not exists (select 1 from public.vehicle_scores s where s.vehicle_id=new.id and s.score_type='VQI' and s.status<>'INSUFFICIENT_DATA') then raise exception 'VQI_PENDING'; end if;
    if (select count(*) from public.vehicle_media m where m.vehicle_id=new.id and m.media_type='photo' and m.status='approved') < 4 then raise exception 'MEDIA_NOT_READY'; end if;
    if new.asking_price <= 0 then raise exception 'PRICING_NOT_READY'; end if;
  end if;
  if new.lifecycle_status='AVAILABLE' and not exists (
    select 1 from public.vehicle_publications p where p.vehicle_id=new.id and p.status='published' and p.published_at is not null and p.ended_at is null
  ) then raise exception 'PUBLICATION_NOT_READY'; end if;
  return new;
end $$;
drop trigger if exists vehicles_inventory_readiness_guard on public.vehicles;
create trigger vehicles_inventory_readiness_guard before update of lifecycle_status on public.vehicles
for each row when (old.lifecycle_status is distinct from new.lifecycle_status)
execute function public.enforce_vehicle_inventory_readiness();
