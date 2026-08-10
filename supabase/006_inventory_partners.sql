-- AutoPonte Inventory & Partners V1.7
create table if not exists public.partners (
  id text primary key,
  name text not null,
  legal_name text not null default '',
  document text not null default '',
  partner_type text not null default 'dealer',
  status text not null default 'active',
  contact_name text not null default '',
  phone_ddi text not null default '55',
  phone_local text not null default '',
  phone_e164 text not null default '',
  email text not null default '',
  city text not null default '',
  state text not null default '',
  integration_mode text not null default 'manual',
  external_system text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vehicles add column if not exists inventory_scope text not null default 'autoponte';
alter table public.vehicles add column if not exists partner_id text not null default '';
update public.vehicles set inventory_scope='partner' where source_type='partner_inventory' and inventory_scope='autoponte';
create unique index if not exists partners_document_unique on public.partners(document) where document<>'';
create index if not exists partners_status_idx on public.partners(status);
create index if not exists partners_name_idx on public.partners(name);
create index if not exists vehicles_inventory_scope_idx on public.vehicles(inventory_scope,status);
create index if not exists vehicles_partner_id_idx on public.vehicles(partner_id,status) where partner_id<>'';
