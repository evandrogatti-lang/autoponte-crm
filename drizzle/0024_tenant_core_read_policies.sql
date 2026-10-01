-- AutoPonte CRM — Tenant Core RLS Policy 1
-- Target: teste2 only, after approved preflight and controlled bootstrap.
-- Read-only access for authenticated; no client writes.

begin;

revoke all privileges on table
  public.tenants,
  public.stores,
  public.memberships,
  public.role_assignments,
  public.store_access
from anon, authenticated;

create policy memberships_select_own_active
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  and status = 'active'
);

create policy role_assignments_select_own_active
on public.role_assignments
for select
to authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.memberships m
    where m.id = role_assignments.membership_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy store_access_select_own_active
on public.store_access
for select
to authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.memberships m
    where m.id = store_access.membership_id
      and m.tenant_id = store_access.tenant_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy tenants_select_own_active_membership
on public.tenants
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.tenant_id = tenants.id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

create policy stores_select_owner_or_authorized_store_access
on public.stores
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.tenant_id = stores.tenant_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (
        exists (
          select 1
          from public.role_assignments ra
          where ra.membership_id = m.id
            and ra.status = 'active'
            and ra.role_code = 'owner'
        )
        or (
          exists (
            select 1
            from public.role_assignments ra
            where ra.membership_id = m.id
              and ra.status = 'active'
              and ra.role_code in ('manager', 'seller')
          )
          and exists (
            select 1
            from public.store_access sa
            where sa.tenant_id = m.tenant_id
              and sa.membership_id = m.id
              and sa.store_id = stores.id
              and sa.status = 'active'
          )
        )
      )
  )
);

grant select on table
  public.tenants,
  public.stores,
  public.memberships,
  public.role_assignments,
  public.store_access
to authenticated;

commit;
