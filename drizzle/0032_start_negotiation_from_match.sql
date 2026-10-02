-- AP-CRM-005: additive reference, no backfill. Empty Negotiation preflight on teste2.
alter table public.negotiations add column tenant_vehicle_id text;
alter table public.negotiations add constraint negotiations_vehicle_same_tenant_fkey
  foreign key(tenant_id,tenant_vehicle_id) references public.tenant_vehicles(tenant_id,id) on delete restrict;
alter table public.negotiations add constraint negotiations_match_vehicle_check
  check(match_id is null or tenant_vehicle_id is not null);
create index negotiations_vehicle_idx on public.negotiations(tenant_id,tenant_vehicle_id);

-- The AP-CRM-004V typed, immutable mapping is the only vehicle authority.
-- Caller must keep the transaction open through any dependent write.
create function public.resolve_match_vehicle(p_tenant uuid,p_match text)
returns table(vehicle_id text,specification_id text,actionable boolean)
language plpgsql security invoker set search_path='' as $$
declare m public.vehicle_matches%rowtype;
begin
  select vm.* into m from public.vehicle_matches vm join public.buyer_profiles b on b.id=vm.buyer_profile_id
    where vm.id=p_match and b.tenant_id=p_tenant for share of vm,b;
  if not found then raise exception 'Match unavailable in authorized Tenant' using errcode='42501'; end if;
  if m.source_type='inventory' and m.vehicle_id is not null and m.vehicle_id<>m.source_id then return; end if;
  return query select v.id,v.vehicle_specification_id,v.status='available'
    from public.tenant_vehicle_source_links l join public.tenant_vehicles v on v.id=l.tenant_vehicle_id and v.tenant_id=l.tenant_id
    where l.tenant_id=p_tenant and (
      (m.source_type='inventory' and l.inventory_vehicle_id=m.source_id) or
      (m.source_type='trade_in' and l.trade_in_id=m.source_id) or
      (m.source_type='consignment' and l.consignment_id=m.source_id)) for share of l,v;
end $$;
revoke all on function public.resolve_match_vehicle(uuid,text) from public,anon,authenticated;

create function public.guard_negotiation_vehicle() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v record;
begin
  if tg_op='UPDATE' then
    if new.tenant_vehicle_id is distinct from old.tenant_vehicle_id then
      raise exception 'Negotiation creation vehicle is immutable; correction requires an audited command' using errcode='23514';
    end if;
    return new;
  end if;
  if new.match_id is not null then
    select * into v from public.resolve_match_vehicle(new.tenant_id,new.match_id);
    if not found then raise exception 'UNRESOLVED TenantVehicle' using errcode='23514'; end if;
    if v.vehicle_id is distinct from new.tenant_vehicle_id then raise exception 'CONFLICT TenantVehicle' using errcode='23514'; end if;
    if not v.actionable then raise exception 'TenantVehicle is not available' using errcode='23514'; end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_negotiation_vehicle() from public,anon,authenticated;
create trigger negotiations_vehicle_guard before insert or update on public.negotiations for each row execute function public.guard_negotiation_vehicle();

-- Preserve source provenance after initiation; score/reasons remain writable Match intelligence.
create or replace function public.guard_negotiation_match_profile() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if row(new.buyer_profile_id,new.source_type,new.source_id,new.vehicle_id)
    is distinct from row(old.buyer_profile_id,old.source_type,old.source_id,old.vehicle_id)
    and exists(select 1 from public.negotiations n where n.match_id=old.id) then
    raise exception 'Referenced Match identity/source is immutable' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger negotiation_match_profile_guard on public.vehicle_matches;
create trigger negotiation_match_profile_guard before update of buyer_profile_id,source_type,source_id,vehicle_id
  on public.vehicle_matches for each row execute function public.guard_negotiation_match_profile();

create function public.start_negotiation_from_match(
  p_id text,p_tenant uuid,p_creator uuid,p_user uuid,p_responsible uuid,p_match text,p_lead text
) returns table(negotiation_id text,created boolean)
language plpgsql security invoker set search_path='' as $$
declare profile text; customer text; lead_customer text; v record; existing public.negotiations%rowtype;
begin
  perform 1 from public.tenants where id=p_tenant and status='active' for share;
  if not found then raise exception 'Tenant authorization denied' using errcode='42501'; end if;
  perform 1 from public.memberships where id=p_creator and tenant_id=p_tenant and user_id=p_user and status='active' and revoked_at is null for share;
  if not found then raise exception 'Creator authorization denied' using errcode='42501'; end if;
  perform 1 from public.role_assignments where membership_id=p_creator and status='active' and revoked_at is null and role_code in ('owner','manager','seller') for share;
  if not found then raise exception 'Creator role denied' using errcode='42501'; end if;
  perform 1 from public.memberships where id=p_responsible and tenant_id=p_tenant and status='active' and revoked_at is null for share;
  if not found then raise exception 'Responsible Membership unavailable' using errcode='42501'; end if;
  perform 1 from public.role_assignments where membership_id=p_responsible and status='active' and revoked_at is null and role_code='seller' for share;
  if not found then raise exception 'Responsible seller role denied' using errcode='42501'; end if;
  if p_id is null or p_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Textual UUID Negotiation identity required' using errcode='23514';
  end if;
  -- Serialize initiation for this Match before testing existence. At READ COMMITTED,
  -- subsequent statements see the winner after waiting. Partial uniqueness is the backstop.
  select m.buyer_profile_id into profile from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id
    where m.id=p_match and b.tenant_id=p_tenant for update of m;
  if not found then raise exception 'Match unavailable in authorized Tenant' using errcode='42501'; end if;
  select b.customer_id into customer from public.buyer_profiles b where b.id=profile and b.tenant_id=p_tenant for share;
  if not found then raise exception 'BuyerProfile unavailable in authorized Tenant' using errcode='42501'; end if;
  if customer is null then raise exception 'UNRESOLVED Customer' using errcode='23514',hint='UNRESOLVED_CUSTOMER'; end if;
  perform 1 from public.customers where id=customer and tenant_id=p_tenant for share;
  if not found then raise exception 'Customer unavailable in authorized Tenant' using errcode='42501'; end if;
  if p_lead is not null then
    perform 1 from public.trade_ins where id=p_lead and tenant_id=p_tenant for share;
    if not found then raise exception 'Lead unavailable in authorized Tenant' using errcode='42501'; end if;
    select customer_id into lead_customer from public.lead_customer_links where lead_id=p_lead and tenant_id=p_tenant;
    if not found then raise exception 'UNRESOLVED Lead Customer' using errcode='23514',hint='UNRESOLVED_CUSTOMER'; end if;
    if lead_customer is distinct from customer then raise exception 'CONFLICT Customer' using errcode='23514',hint='CONFLICT_CUSTOMER'; end if;
  end if;
  select * into v from public.resolve_match_vehicle(p_tenant,p_match);
  if not found then raise exception 'UNRESOLVED TenantVehicle' using errcode='23514',hint='UNRESOLVED_VEHICLE'; end if;
  if not v.actionable then raise exception 'TenantVehicle is not available' using errcode='23514',hint='VEHICLE_UNAVAILABLE'; end if;
  select * into existing from public.negotiations n where n.tenant_id=p_tenant and n.match_id=p_match
    order by n.created_at desc,n.id desc limit 1 for update;
  if found then
    if existing.lifecycle='closed' or existing.origin<>'match_manual' or
      row(existing.customer_id,existing.buyer_profile_id,existing.tenant_vehicle_id,existing.lead_id,existing.responsible_membership_id)
      is distinct from row(customer,profile,v.vehicle_id,p_lead,p_responsible) then
      raise exception 'Existing Negotiation requires an explicit correction/reactivation decision' using errcode='23514',hint='NEGOTIATION_CONFLICT';
    end if;
    return query select existing.id,false;
    return;
  end if;
  insert into public.negotiations(id,tenant_id,customer_id,lead_id,buyer_profile_id,match_id,tenant_vehicle_id,responsible_membership_id,created_by_membership_id,origin)
    values(p_id,p_tenant,customer,p_lead,profile,p_match,v.vehicle_id,p_responsible,p_creator,'match_manual');
  return query select p_id,true;
end $$;
revoke all on function public.start_negotiation_from_match(text,uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
