-- AutoPonte E2E Pilot Phase 1: additive operational spine.
-- Existing intake, inventory, matching and seller-operation tables remain authoritative.

create table if not exists public.customers (
  id text primary key, name text not null, document text not null default '',
  whatsapp text not null default '', email text not null default '', city text not null default '',
  state text not null default '', status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.commercial_cases (
  id text primary key, pilot_code text not null default '', vehicle_id text references public.vehicles(id),
  customer_id text references public.customers(id), opportunity_id text references public.trade_ins(id),
  partner_id text not null default '', seller_profile_id text references public.seller_profiles(id),
  acquisition_mode text not null check (acquisition_mode in ('direct_purchase','trade_in','consignment','appraisal_only')),
  status text not null default 'opened', opened_at timestamptz not null,
  closed_at timestamptz, final_outcome text not null default '', notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(pilot_code)
);
create index if not exists commercial_cases_vehicle_idx on public.commercial_cases(vehicle_id);
create index if not exists commercial_cases_customer_idx on public.commercial_cases(customer_id);

create table if not exists public.vehicle_lifecycle_events (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  vehicle_id text references public.vehicles(id), event_type text not null, status text not null default 'completed',
  occurred_at timestamptz not null, amount integer, description text not null default '',
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists vehicle_lifecycle_case_time_idx on public.vehicle_lifecycle_events(case_id, occurred_at);

create table if not exists public.vehicle_cost_entries (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  vehicle_id text not null references public.vehicles(id), category text not null,
  description text not null default '', amount integer not null check (amount >= 0),
  incurred_at date not null, partner_id text not null default '', status text not null default 'approved',
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_work_orders (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  vehicle_id text not null references public.vehicles(id), work_type text not null,
  description text not null default '', status text not null, estimated_cost integer not null default 0,
  actual_cost integer not null default 0, opened_at timestamptz not null, completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_media (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  vehicle_id text not null references public.vehicles(id), media_type text not null default 'photo',
  storage_key text not null, status text not null default 'pending', position integer not null default 0,
  captured_at timestamptz, approved_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.vehicle_publications (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  vehicle_id text not null references public.vehicles(id), channel text not null,
  status text not null default 'draft', asking_price integer not null,
  external_reference text not null default '', published_at timestamptz, ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_price_history (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  vehicle_id text not null references public.vehicles(id), old_price integer,
  new_price integer not null, reason text not null default '', changed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_intents (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  customer_id text not null references public.customers(id), buyer_profile_id text references public.buyer_profiles(id),
  status text not null default 'active', hard_constraints jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb, financing jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null, closed_at timestamptz, created_at timestamptz not null default now()
);

alter table public.vehicle_matches add column if not exists case_id text references public.commercial_cases(id);
alter table public.vehicle_matches add column if not exists vehicle_id text references public.vehicles(id);
alter table public.vehicle_matches add column if not exists outcome text not null default '';

create table if not exists public.match_interactions (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  match_id text not null references public.vehicle_matches(id) on delete cascade,
  interaction_type text not null, channel text not null default '', outcome text not null default '',
  notes text not null default '', occurred_at timestamptz not null, created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  opportunity_id text references public.trade_ins(id), match_id text references public.vehicle_matches(id),
  vehicle_id text not null references public.vehicles(id), customer_id text not null references public.customers(id),
  sequence integer not null default 1, status text not null, vehicle_price integer not null,
  trade_in_credit integer not null default 0, down_payment integer not null default 0,
  financed_amount integer not null default 0, installments integer not null default 0,
  installment_amount integer not null default 0, fees integer not null default 0,
  total_amount integer not null, valid_until date, rejection_reason text not null default '',
  proposed_at timestamptz not null, decided_at timestamptz, created_at timestamptz not null default now(),
  unique(case_id, sequence)
);

create table if not exists public.commercial_contracts (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  proposal_id text not null references public.proposals(id), contract_type text not null,
  status text not null, contract_number text not null default '', signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_records (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  proposal_id text not null references public.proposals(id), payment_type text not null,
  provider text not null default '', amount integer not null check (amount >= 0), status text not null,
  due_at timestamptz, paid_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.vehicle_deliveries (
  id text primary key, case_id text not null unique references public.commercial_cases(id) on delete cascade,
  vehicle_id text not null references public.vehicles(id), customer_id text not null references public.customers(id),
  status text not null, scheduled_at timestamptz, delivered_at timestamptz,
  checklist jsonb not null default '{}'::jsonb, notes text not null default '', created_at timestamptz not null default now()
);

create table if not exists public.post_sale_followups (
  id text primary key, case_id text not null references public.commercial_cases(id) on delete cascade,
  customer_id text not null references public.customers(id), status text not null,
  due_at timestamptz not null, completed_at timestamptz, outcome text not null default '',
  notes text not null default '', created_at timestamptz not null default now()
);
