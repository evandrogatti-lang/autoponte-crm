create table if not exists public.trade_ins (
  id text primary key, name text not null, whatsapp text not null, email text not null, city text not null,
  brand text not null, model text not null, version text not null, year text not null, mileage integer not null,
  condition text not null, desired_vehicle text not null default '', reference_price integer not null,
  fipe_code text not null default '', fipe_month text not null default '', estimated_min integer not null,
  estimated_max integer not null, photo_keys text not null, status text not null default 'pre_evaluated',
  lead_category text not null default 'new', next_follow_up text not null default '', last_contact_at text not null default '',
  notes text not null default '', consent_at text not null, created_at timestamptz not null default now()
);
create table if not exists public.consignments (
  id text primary key, access_token_hash text not null, owner_name text not null, whatsapp text not null,
  email text not null, city text not null, vehicle_name text not null, year text not null, mileage integer not null,
  plate text not null default '', asking_price integer not null, minimum_price integer not null,
  photo_keys text not null default '[]', status text not null default 'intake_received', consent_at text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.buyer_profiles (
  id text primary key, name text not null, whatsapp text not null, email text not null, city text not null,
  budget_max integer not null, down_payment integer not null default 0, max_monthly_payment integer not null default 0,
  vehicle_types text not null default '[]', preferred_models text not null default '', min_year integer not null default 0,
  max_mileage integer not null default 999999, transmission text not null default 'Indiferente', fuel text not null default 'Indiferente',
  use_case text not null default '', purchase_timeline text not null default 'Sem urgência', alerts_consent boolean not null default false,
  consent_at text not null, status text not null default 'active', created_at timestamptz not null default now()
);
create table if not exists public.vehicle_matches (
  id text primary key, buyer_profile_id text not null references public.buyer_profiles(id) on delete cascade,
  source_type text not null, source_id text not null, vehicle_label text not null, vehicle_price integer not null default 0,
  score integer not null, reasons text not null default '[]', message_draft text not null default '',
  status text not null default 'review_pending', created_at timestamptz not null default now(), reviewed_at text not null default ''
);
create unique index if not exists vehicle_matches_source_buyer_unique on public.vehicle_matches(source_type, source_id, buyer_profile_id);
insert into storage.buckets (id, name, public) values ('vehicle-photos', 'vehicle-photos', false) on conflict (id) do nothing;
