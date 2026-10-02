-- AP-CRM-003D: preserve established BuyerProfile Tenant constraint behavior.
-- BuyerProfile ownership stays governed by NOT NULL, Tenant/identity FKs and Match guards.
-- Only the dedicated current Lead mapping has immutable Tenant ownership.
begin;
create or replace function public.identity_link_requires_event() returns trigger
language plpgsql security invoker set search_path='' as $$
declare prior text; resulting text; root_id text; scope uuid; profile_kind boolean;
begin
  profile_kind:=tg_table_name='buyer_profiles';
  if not profile_kind and tg_op='UPDATE' then
    if new.lead_id is distinct from old.lead_id then
      raise exception 'Lead identity root is immutable' using errcode='23514';
    end if;
  end if;
  if not profile_kind and tg_op='UPDATE' then
    if new.tenant_id is distinct from old.tenant_id then
      raise exception 'Lead mapping Tenant is immutable' using errcode='23514';
    end if;
  end if;
  if tg_op<>'INSERT' then prior:=old.customer_id; end if;
  if tg_op<>'DELETE' then resulting:=new.customer_id; end if;
  if prior is not distinct from resulting then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='DELETE' then scope:=old.tenant_id; root_id:=old.lead_id;
  else
    scope:=new.tenant_id;
    if profile_kind then root_id:=new.id; else root_id:=new.lead_id; end if;
  end if;
  if not exists(select 1 from public.identity_link_events e
    join public.memberships m on m.id=e.actor_membership_id and m.tenant_id=e.tenant_id
    join public.tenants t on t.id=e.tenant_id
    where e.transaction_id=txid_current() and e.tenant_id=scope
    and ((profile_kind and e.buyer_profile_id=root_id) or (not profile_kind and e.lead_id=root_id))
    and e.previous_customer_id is not distinct from prior and e.customer_id is not distinct from resulting
    and m.status='active' and m.revoked_at is null and t.status='active'
    and exists(select 1 from public.role_assignments r where r.membership_id=m.id and r.status='active' and r.revoked_at is null)) then
    raise exception 'Confirmed identity requires authenticated provenance' using errcode='23514';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
commit;
