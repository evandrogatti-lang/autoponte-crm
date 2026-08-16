-- Fase 1/MVP da RFC-0012. Atribuicoes sao historicas; a oportunidade continua em trade_ins.
create table if not exists public.seller_profiles (
  id text primary key, crm_user_id text not null references public.crm_users(id) on delete cascade,
  partner_id text not null default '', status text not null default 'active',
  availability_status text not null default 'available', capacity integer not null default 1,
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(crm_user_id)
);
create index if not exists seller_profiles_partner_status_idx on public.seller_profiles(partner_id, status);
create table if not exists public.seller_specialties (
  id text primary key, seller_profile_id text not null references public.seller_profiles(id) on delete cascade,
  specialty text not null, active boolean not null default true, unique(seller_profile_id, specialty)
);
create table if not exists public.seller_availability (
  id text primary key, seller_profile_id text not null references public.seller_profiles(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'available', source text not null default 'autoponte', note text not null default ''
);
create index if not exists seller_availability_profile_time_idx on public.seller_availability(seller_profile_id, starts_at);
create table if not exists public.seller_appointments (
  id text primary key, opportunity_id text not null references public.trade_ins(id) on delete cascade,
  seller_profile_id text not null references public.seller_profiles(id), starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'scheduled', source text not null default 'autoponte', note text not null default '', created_at timestamptz not null default now()
);
create index if not exists seller_appointments_seller_time_idx on public.seller_appointments(seller_profile_id, starts_at);
create table if not exists public.seller_assignments (
  id text primary key, opportunity_id text not null references public.trade_ins(id) on delete cascade,
  seller_profile_id text not null references public.seller_profiles(id), assigned_by_user_id text not null default '',
  status text not null default 'assigned', outcome text not null default '', reason text not null default '', assigned_at timestamptz not null default now(),
  accepted_at timestamptz, first_contact_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists seller_assignments_opportunity_status_idx on public.seller_assignments(opportunity_id, status);
create index if not exists seller_assignments_seller_status_idx on public.seller_assignments(seller_profile_id, status);
insert into public.crm_role_permissions (id, role_id, permission) values
  ('perm_manager_seller_operations','role_manager','seller_operations.manage'),
  ('perm_sales_seller_operations','role_sales','seller_operations.manage')
on conflict (role_id, permission) do nothing;
alter table public.seller_profiles enable row level security;
alter table public.seller_specialties enable row level security;
alter table public.seller_availability enable row level security;
alter table public.seller_appointments enable row level security;
alter table public.seller_assignments enable row level security;