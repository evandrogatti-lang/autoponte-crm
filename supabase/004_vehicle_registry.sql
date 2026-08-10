create table if not exists public.vehicles (
  id text primary key,
  source_type text not null default 'partner_inventory',
  status text not null default 'available',
  plate text not null default '',
  chassis text not null default '',
  stock_code text not null default '',
  brand_code text not null,
  model_code text not null,
  year_code text not null,
  brand text not null,
  model text not null,
  model_year integer not null,
  fuel text not null default '',
  fipe_code text not null,
  fipe_reference_month text not null,
  fipe_value integer not null,
  mileage integer not null default 0,
  color text not null default '',
  city text not null default '',
  owner_name text not null default '',
  asking_price integer not null default 0,
  acquisition_cost integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists vehicles_plate_unique_idx on public.vehicles (plate) where plate <> '';
create index if not exists vehicles_status_updated_idx on public.vehicles (status, updated_at desc);
create index if not exists vehicles_brand_model_year_idx on public.vehicles (brand, model, model_year);
create index if not exists vehicles_source_type_idx on public.vehicles (source_type);
