-- Lifecycle L1 is additive: vehicles remain canonical and existing commercial rows are preserved.
alter table public.vehicles add column if not exists origin text;
alter table public.vehicles add column if not exists previous_owner_customer_id text references public.customers(id) on delete restrict;
alter table public.vehicles add column if not exists source_case_id text references public.commercial_cases(id) on delete restrict;
alter table public.vehicles add column if not exists source_negotiation_id text references public.trade_ins(id) on delete restrict;
alter table public.vehicles add column if not exists entry_at timestamptz;
alter table public.vehicles add column if not exists appraisal_value integer not null default 0;
alter table public.vehicles add column if not exists credited_paid_value integer not null default 0;
alter table public.vehicles add column if not exists lifecycle_status text;
alter table public.vehicles add column if not exists lifecycle_blockers jsonb not null default '[]'::jsonb;

update public.vehicles set origin = case source_type
  when 'trade_in' then 'trade_in' when 'consignment' then 'consignment'
  when 'dealer_inventory' then 'purchase' when 'autoponte_inventory' then 'purchase'
  when 'direct_purchase' then 'purchase' else 'other' end
where origin is null;
update public.vehicles set lifecycle_status = case status
  when 'evaluation' then 'PENDING_ENTRY' when 'available' then 'AVAILABLE'
  when 'reserved' then 'RESERVED' when 'sold' then 'SOLD' when 'unavailable' then 'PREPARATION'
  else 'IN_STOCK' end where lifecycle_status is null;
update public.vehicles set entry_at = nullif(acquisition_date, '')::date where entry_at is null and acquisition_date ~ '^\d{4}-\d{2}-\d{2}$';

-- Backfill historical trade-in provenance from existing relationships without creating vehicles or commercial rows.
with provenance as (
  select distinct on (m.vehicle_id) m.vehicle_id, t.id negotiation_id, c.id case_id,
    c.customer_id previous_owner_id, c.opened_at,
    coalesce(nullif(t.estimated_max, 0), t.reference_price, 0) appraisal,
    coalesce(p.trade_in_credit, 0) credited
  from public.vehicle_matches m
  join public.trade_ins t on m.source_type = 'trade_in' and m.source_id = t.id
  left join public.commercial_cases c on c.opportunity_id = t.id
  left join public.proposals p on p.case_id = c.id and p.status = 'accepted'
  where m.vehicle_id is not null
  order by m.vehicle_id, c.opened_at asc nulls last, p.proposed_at desc nulls last
)
update public.vehicles v set
  source_negotiation_id = coalesce(v.source_negotiation_id, provenance.negotiation_id),
  source_case_id = coalesce(v.source_case_id, provenance.case_id),
  previous_owner_customer_id = coalesce(v.previous_owner_customer_id, provenance.previous_owner_id),
  entry_at = coalesce(v.entry_at, provenance.opened_at),
  appraisal_value = case when v.appraisal_value = 0 then provenance.appraisal else v.appraisal_value end,
  credited_paid_value = case when v.credited_paid_value = 0 then provenance.credited else v.credited_paid_value end
from provenance where v.id = provenance.vehicle_id and v.origin = 'trade_in';

-- The Preview pilot spine links the acquisition case directly to its canonical vehicle.
with provenance as (
  select distinct on (c.vehicle_id) c.vehicle_id, c.opportunity_id negotiation_id, c.id case_id,
    c.customer_id previous_owner_id, c.opened_at,
    coalesce(nullif(t.estimated_max, 0), t.reference_price, 0) appraisal,
    coalesce(p.trade_in_credit, 0) credited
  from public.commercial_cases c
  left join public.trade_ins t on t.id = c.opportunity_id
  left join public.proposals p on p.case_id = c.id and p.status = 'accepted'
  where c.acquisition_mode = 'trade_in' and c.vehicle_id is not null
  order by c.vehicle_id, c.opened_at asc, p.proposed_at desc nulls last
)
update public.vehicles v set
  source_negotiation_id = coalesce(v.source_negotiation_id, provenance.negotiation_id),
  source_case_id = coalesce(v.source_case_id, provenance.case_id),
  previous_owner_customer_id = coalesce(v.previous_owner_customer_id, provenance.previous_owner_id),
  entry_at = coalesce(v.entry_at, provenance.opened_at),
  appraisal_value = case when v.appraisal_value = 0 then provenance.appraisal else v.appraisal_value end,
  credited_paid_value = case when v.credited_paid_value = 0 then provenance.credited else v.credited_paid_value end
from provenance where v.id = provenance.vehicle_id and v.origin = 'trade_in';

alter table public.vehicles alter column origin set not null;
alter table public.vehicles alter column lifecycle_status set not null;
alter table public.vehicles add constraint vehicles_origin_check check (origin in ('purchase','trade_in','consignment','other'));
alter table public.vehicles add constraint vehicles_lifecycle_status_check check (lifecycle_status in ('PENDING_ENTRY','IN_STOCK','PREPARATION','READY','PUBLISHED','AVAILABLE','RESERVED','SOLD','DELIVERED'));
alter table public.vehicles add constraint vehicles_lifecycle_blockers_check check (jsonb_typeof(lifecycle_blockers) = 'array' and lifecycle_blockers <@ '["DOCUMENT_BLOCKED","MAINTENANCE_BLOCKED","VQI_PENDING"]'::jsonb);
alter table public.vehicles add constraint vehicles_terminal_blockers_check check (lifecycle_status not in ('SOLD','DELIVERED') or lifecycle_blockers = '[]'::jsonb);
create index if not exists vehicles_source_case_idx on public.vehicles(source_case_id);
create index if not exists vehicles_previous_owner_idx on public.vehicles(previous_owner_customer_id);

alter table public.vehicle_lifecycle_events alter column case_id drop not null;
alter table public.vehicle_lifecycle_events drop constraint if exists vehicle_lifecycle_events_case_id_fkey;
alter table public.vehicle_lifecycle_events add constraint vehicle_lifecycle_events_case_id_fkey foreign key (case_id) references public.commercial_cases(id) on delete set null;
create index if not exists vehicle_lifecycle_vehicle_time_idx on public.vehicle_lifecycle_events(vehicle_id, occurred_at desc);

create or replace function public.enforce_commercial_customer_context() returns trigger language plpgsql as $$
declare case_customer text;
begin
  select customer_id into case_customer from public.commercial_cases where id = new.case_id;
  if case_customer is null or new.customer_id is distinct from case_customer then
    raise exception 'Commercial customer must be the customer of the current case';
  end if;
  return new;
end $$;
drop trigger if exists proposals_customer_context on public.proposals;
create trigger proposals_customer_context before insert or update of case_id, customer_id on public.proposals for each row execute function public.enforce_commercial_customer_context();
drop trigger if exists deliveries_customer_context on public.vehicle_deliveries;
create trigger deliveries_customer_context before insert or update of case_id, customer_id on public.vehicle_deliveries for each row execute function public.enforce_commercial_customer_context();

comment on column public.vehicles.previous_owner_customer_id is 'Historical provenance only; never the customer context for a future sale.';
comment on column public.commercial_cases.customer_id is 'Current interested customer for this independent commercial cycle.';
