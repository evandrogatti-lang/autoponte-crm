-- AP-CRM-004V: additive empty canonical persistence. Backfill/mappings = 0.
-- FIPE and legacy strings are evidence, never automatic global technical identity.
create table public.vehicle_specifications (
  id text primary key,
  brand text not null,
  model text not null,
  model_year integer not null,
  fuel text not null default '',
  transmission text not null default '',
  evidence_source text not null,
  evidence_reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_specifications_brand_check check(length(btrim(brand)) between 1 and 120),
  constraint vehicle_specifications_model_check check(length(btrim(model)) between 1 and 240),
  constraint vehicle_specifications_year_check check(model_year between 1886 and 2200),
  constraint vehicle_specifications_evidence_check check(length(btrim(evidence_source)) between 1 and 100 and length(btrim(evidence_reference)) between 1 and 1000)
);
create table public.tenant_vehicles (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  vehicle_specification_id text references public.vehicle_specifications(id) on delete restrict,
  status text not null default 'qualification',
  created_by_membership_id uuid not null,
  registration_reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_vehicles_tenant_id_id_key unique(tenant_id,id),
  constraint tenant_vehicles_creator_same_tenant_fkey foreign key(tenant_id,created_by_membership_id) references public.memberships(tenant_id,id) on delete restrict,
  constraint tenant_vehicles_status_check check(status in ('qualification','available','unavailable')),
  constraint tenant_vehicles_reason_check check(length(btrim(registration_reason)) between 1 and 1000)
);
create index tenant_vehicles_specification_idx on public.tenant_vehicles(vehicle_specification_id);
create index tenant_vehicles_creator_idx on public.tenant_vehicles(tenant_id,created_by_membership_id);
create table public.tenant_vehicle_source_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tenant_vehicle_id text not null,
  inventory_vehicle_id text references public.vehicles(id) on delete restrict,
  trade_in_id text,
  consignment_id text references public.consignments(id) on delete restrict,
  confirmed_by_membership_id uuid not null,
  reason text not null,
  confirmed_at timestamptz not null default now(),
  constraint tenant_vehicle_links_vehicle_same_tenant_fkey foreign key(tenant_id,tenant_vehicle_id) references public.tenant_vehicles(tenant_id,id) on delete restrict,
  constraint tenant_vehicle_links_actor_same_tenant_fkey foreign key(tenant_id,confirmed_by_membership_id) references public.memberships(tenant_id,id) on delete restrict,
  constraint tenant_vehicle_links_lead_same_tenant_fkey foreign key(tenant_id,trade_in_id) references public.trade_ins(tenant_id,id) on delete restrict,
  constraint tenant_vehicle_links_source_check check(num_nonnulls(inventory_vehicle_id,trade_in_id,consignment_id)=1),
  constraint tenant_vehicle_links_reason_check check(length(btrim(reason)) between 1 and 1000)
);
create unique index tenant_vehicle_links_inventory_key on public.tenant_vehicle_source_links(inventory_vehicle_id);
create unique index tenant_vehicle_links_trade_in_key on public.tenant_vehicle_source_links(trade_in_id);
create unique index tenant_vehicle_links_consignment_key on public.tenant_vehicle_source_links(consignment_id);
create index tenant_vehicle_links_vehicle_idx on public.tenant_vehicle_source_links(tenant_id,tenant_vehicle_id);
create index tenant_vehicle_links_actor_idx on public.tenant_vehicle_source_links(tenant_id,confirmed_by_membership_id);
create index tenant_vehicle_links_lead_idx on public.tenant_vehicle_source_links(tenant_id,trade_in_id);
alter table public.vehicle_specifications enable row level security;
alter table public.tenant_vehicles enable row level security;
alter table public.tenant_vehicle_source_links enable row level security;
revoke all on public.vehicle_specifications,public.tenant_vehicles,public.tenant_vehicle_source_links from public,anon,authenticated;

create function public.guard_tenant_vehicle_creation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if row(new.id,new.tenant_id,new.created_by_membership_id,new.registration_reason,new.created_at)
    is distinct from row(old.id,old.tenant_id,old.created_by_membership_id,old.registration_reason,old.created_at) then
    raise exception 'Canonical vehicle ownership/creation provenance is immutable' using errcode='23514';
  end if;
  new.updated_at := greatest(clock_timestamp(),new.created_at);
  return new;
end $$;
create trigger tenant_vehicle_creation_guard before update on public.tenant_vehicles for each row execute function public.guard_tenant_vehicle_creation();
create function public.tenant_vehicle_links_append_only() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'Vehicle mappings are explicit immutable provenance; correction requires a separately audited command' using errcode='23514'; end $$;
create trigger tenant_vehicle_links_append_only before update or delete on public.tenant_vehicle_source_links for each row execute function public.tenant_vehicle_links_append_only();

create function public.assert_vehicle_registry_actor(p_tenant uuid,p_member uuid,p_user uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.tenants where id=p_tenant and status='active' for share;
  if not found then raise exception 'Tenant authorization denied' using errcode='42501'; end if;
  perform 1 from public.memberships where id=p_member and tenant_id=p_tenant and user_id=p_user and status='active' and revoked_at is null for share;
  if not found then raise exception 'Vehicle registry actor denied' using errcode='42501'; end if;
  perform 1 from public.role_assignments where membership_id=p_member and role_code in ('owner','manager') and status='active' and revoked_at is null for share;
  if not found then raise exception 'Vehicle registry owner/manager role required' using errcode='42501'; end if;
end $$;
create function public.register_tenant_vehicle(p_id text,p_tenant uuid,p_member uuid,p_user uuid,p_specification text,p_status text,p_reason text) returns text
language plpgsql security invoker set search_path='' as $$
begin
  perform public.assert_vehicle_registry_actor(p_tenant,p_member,p_user);
  if p_id is null or p_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Textual UUID vehicle identity required' using errcode='23514';
  end if;
  insert into public.tenant_vehicles(id,tenant_id,vehicle_specification_id,status,created_by_membership_id,registration_reason)
    values(p_id,p_tenant,p_specification,p_status,p_member,p_reason);
  return p_id;
end $$;
create function public.confirm_tenant_vehicle_source(p_tenant uuid,p_member uuid,p_user uuid,p_vehicle text,p_source_type text,p_source_id text,p_reason text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare link_id uuid;
begin
  perform public.assert_vehicle_registry_actor(p_tenant,p_member,p_user);
  perform 1 from public.tenant_vehicles where id=p_vehicle and tenant_id=p_tenant for share;
  if not found then raise exception 'Vehicle unavailable in authorized Tenant' using errcode='42501'; end if;
  -- Explicit review supplies ownership for unscoped legacy inventory/consignments.
  -- No Store, partner, Case, contact or FIPE inference participates.
  if p_source_type='inventory' then
    perform 1 from public.vehicles where id=p_source_id for share;
    if not found then raise exception 'Legacy inventory source unavailable' using errcode='23503'; end if;
  elsif p_source_type='trade_in' then
    perform 1 from public.trade_ins where id=p_source_id and tenant_id=p_tenant for share;
    if not found then raise exception 'Trade-in source unavailable in authorized Tenant' using errcode='23503'; end if;
  elsif p_source_type='consignment' then
    perform 1 from public.consignments where id=p_source_id for share;
    if not found then raise exception 'Consignment source unavailable' using errcode='23503'; end if;
  else raise exception 'Unsupported canonical vehicle source' using errcode='23514'; end if;
  insert into public.tenant_vehicle_source_links(tenant_id,tenant_vehicle_id,inventory_vehicle_id,trade_in_id,consignment_id,confirmed_by_membership_id,reason)
    values(p_tenant,p_vehicle,case when p_source_type='inventory' then p_source_id end,case when p_source_type='trade_in' then p_source_id end,case when p_source_type='consignment' then p_source_id end,p_member,p_reason) returning id into link_id;
  return link_id;
end $$;
revoke all on function public.guard_tenant_vehicle_creation(),public.tenant_vehicle_links_append_only(),public.assert_vehicle_registry_actor(uuid,uuid,uuid),public.register_tenant_vehicle(text,uuid,uuid,uuid,text,text,text),public.confirm_tenant_vehicle_source(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
