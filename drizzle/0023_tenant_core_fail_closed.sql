-- AutoPonte CRM — Tenant Core Migration 1
-- Target: teste2 only, after approved preflight.
-- This migration creates no RLS policies and grants no client privileges.

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenants_status_check
    check (status in ('active', 'suspended', 'archived'))
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stores_tenant_id_fkey
    foreign key (tenant_id)
    references public.tenants(id)
    on delete restrict,

  constraint stores_tenant_id_id_key
    unique (tenant_id, id),

  constraint stores_status_check
    check (status in ('active', 'inactive', 'archived'))
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz null,
  revoked_at timestamptz null,

  constraint memberships_tenant_id_fkey
    foreign key (tenant_id)
    references public.tenants(id)
    on delete restrict,

  constraint memberships_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete restrict,

  constraint memberships_tenant_id_user_id_key
    unique (tenant_id, user_id),

  constraint memberships_tenant_id_id_key
    unique (tenant_id, id),

  constraint memberships_status_check
    check (status in ('active', 'suspended', 'revoked')),

  constraint memberships_revoked_at_check
    check (
      (status = 'revoked' and revoked_at is not null)
      or (status <> 'revoked' and revoked_at is null)
    )
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null,
  role_code text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null,

  constraint role_assignments_membership_id_fkey
    foreign key (membership_id)
    references public.memberships(id)
    on delete restrict,

  constraint role_assignments_membership_id_role_code_key
    unique (membership_id, role_code),

  constraint role_assignments_role_code_check
    check (role_code in ('owner', 'manager', 'seller')),

  constraint role_assignments_status_check
    check (status in ('active', 'revoked')),

  constraint role_assignments_revoked_at_check
    check (
      (status = 'revoked' and revoked_at is not null)
      or (status = 'active' and revoked_at is null)
    )
);

create table public.store_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  membership_id uuid not null,
  store_id uuid not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null,

  constraint store_access_membership_same_tenant_fkey
    foreign key (tenant_id, membership_id)
    references public.memberships(tenant_id, id)
    on delete restrict,

  constraint store_access_store_same_tenant_fkey
    foreign key (tenant_id, store_id)
    references public.stores(tenant_id, id)
    on delete restrict,

  constraint store_access_membership_id_store_id_key
    unique (membership_id, store_id),

  constraint store_access_status_check
    check (status in ('active', 'revoked')),

  constraint store_access_revoked_at_check
    check (
      (status = 'revoked' and revoked_at is not null)
      or (status = 'active' and revoked_at is null)
    )
);

create index stores_active_tenant_idx
  on public.stores (tenant_id)
  where status = 'active';

create index memberships_active_user_tenant_idx
  on public.memberships (user_id, tenant_id)
  where status = 'active';

create index role_assignments_active_membership_role_idx
  on public.role_assignments (membership_id, role_code)
  where status = 'active';

create index store_access_active_tenant_membership_store_idx
  on public.store_access (tenant_id, membership_id, store_id)
  where status = 'active';

alter table public.tenants enable row level security;
alter table public.stores enable row level security;
alter table public.memberships enable row level security;
alter table public.role_assignments enable row level security;
alter table public.store_access enable row level security;

revoke all privileges on table
  public.tenants,
  public.stores,
  public.memberships,
  public.role_assignments,
  public.store_access
from anon, authenticated;

-- `updated_at` is initialized on INSERT only. Its update strategy is deferred.
