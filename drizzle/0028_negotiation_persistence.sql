-- AP-CRM-004: new, empty persistence; no backfill or existing business-row changes.
-- Canonical Negotiation vehicle reference: DEFERRED until TenantVehicle persistence exists.
create table public.negotiations (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id text not null,
  lead_id text,
  buyer_profile_id text,
  match_id text references public.vehicle_matches(id) on delete restrict,
  responsible_membership_id uuid not null,
  created_by_membership_id uuid not null,
  origin text not null,
  stage text not null default 'contact',
  lifecycle text not null default 'active',
  closure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  formalized_at timestamptz,
  constraint negotiations_customer_same_tenant_fkey foreign key(tenant_id,customer_id) references public.customers(tenant_id,id) on delete restrict,
  constraint negotiations_lead_same_tenant_fkey foreign key(tenant_id,lead_id) references public.trade_ins(tenant_id,id) on delete restrict,
  constraint negotiations_profile_same_tenant_fkey foreign key(tenant_id,buyer_profile_id) references public.buyer_profiles(tenant_id,id) on delete restrict,
  constraint negotiations_responsible_same_tenant_fkey foreign key(tenant_id,responsible_membership_id) references public.memberships(tenant_id,id) on delete restrict,
  constraint negotiations_creator_same_tenant_fkey foreign key(tenant_id,created_by_membership_id) references public.memberships(tenant_id,id) on delete restrict,
  constraint negotiations_origin_check check(origin in ('match_manual','match_automated','manual','whatsapp','phone','walk_in','marketplace','reactivation')),
  constraint negotiations_stage_check check(stage in ('contact','qualification','negotiation','ready_for_formalization')),
  constraint negotiations_lifecycle_check check(lifecycle in ('active','formalized','closed')),
  constraint negotiations_closure_reason_check check(closure_reason in ('lost','cancelled','expired','no_fit','inactive_customer')),
  constraint negotiations_match_origin_check check((origin in ('match_manual','match_automated')) = (match_id is not null) and (match_id is null or buyer_profile_id is not null)),
  constraint negotiations_lifecycle_metadata_check check(
    (lifecycle='active' and closed_at is null and closure_reason is null and formalized_at is null) or
    (lifecycle='formalized' and formalized_at is not null and closed_at is null and closure_reason is null) or
    (lifecycle='closed' and closed_at is not null and closure_reason is not null and formalized_at is null)),
  constraint negotiations_timestamp_check check(updated_at >= created_at and (closed_at is null or closed_at >= created_at) and (formalized_at is null or formalized_at >= created_at))
);
create unique index negotiations_active_match_key on public.negotiations(tenant_id,match_id) where match_id is not null and lifecycle in ('active','formalized');
create index negotiations_customer_idx on public.negotiations(tenant_id,customer_id);
create index negotiations_lead_idx on public.negotiations(tenant_id,lead_id);
create index negotiations_profile_idx on public.negotiations(tenant_id,buyer_profile_id);
create index negotiations_match_idx on public.negotiations(match_id);
create index negotiations_responsible_idx on public.negotiations(tenant_id,responsible_membership_id);
create index negotiations_creator_idx on public.negotiations(tenant_id,created_by_membership_id);
alter table public.negotiations enable row level security;
-- Follow the Tenant/identity foundation's server-only persistence boundary.
revoke all on public.negotiations from public, anon, authenticated;

create function public.guard_negotiation_identity() returns trigger
language plpgsql security invoker set search_path='' as $$
declare confirmed text; profile text;
begin
  if tg_op='UPDATE' then
    if row(new.id,new.tenant_id,new.customer_id,new.lead_id,new.buyer_profile_id,new.match_id,new.origin,new.created_by_membership_id,new.created_at)
      is distinct from row(old.id,old.tenant_id,old.customer_id,old.lead_id,old.buyer_profile_id,old.match_id,old.origin,old.created_by_membership_id,old.created_at) then
      raise exception 'Negotiation creation identity/provenance is immutable; correction requires a future audited command' using errcode='23514';
    end if;
    -- Later confirmed-link corrections do not rewrite historical Negotiation identity.
    new.updated_at := greatest(clock_timestamp(),new.created_at);
    return new;
  end if;
  perform 1 from public.customers where id=new.customer_id and tenant_id=new.tenant_id for share;
  if not found then raise exception 'Customer unavailable in Negotiation Tenant' using errcode='23503'; end if;
  if new.buyer_profile_id is not null then
    select customer_id into confirmed from public.buyer_profiles where id=new.buyer_profile_id and tenant_id=new.tenant_id for share;
    if not found then raise exception 'BuyerProfile unavailable in Negotiation Tenant' using errcode='23503'; end if;
    if confirmed is null then raise exception 'UNRESOLVED BuyerProfile identity' using errcode='23514'; end if;
    if confirmed <> new.customer_id then raise exception 'CONFLICT BuyerProfile identity' using errcode='23514'; end if;
  end if;
  if new.lead_id is not null then
    -- Confirmations/corrections lock this same root FOR UPDATE before changing its link.
    perform 1 from public.trade_ins where id=new.lead_id and tenant_id=new.tenant_id for share;
    if not found then raise exception 'Lead unavailable in Negotiation Tenant' using errcode='23503'; end if;
    select customer_id into confirmed from public.lead_customer_links where lead_id=new.lead_id and tenant_id=new.tenant_id;
    if not found then raise exception 'UNRESOLVED Lead identity' using errcode='23514'; end if;
    if confirmed <> new.customer_id then raise exception 'CONFLICT Lead identity' using errcode='23514'; end if;
  end if;
  if new.match_id is not null then
    select buyer_profile_id into profile from public.vehicle_matches where id=new.match_id for share;
    if not found then raise exception 'Match unavailable' using errcode='23503'; end if;
    if profile is distinct from new.buyer_profile_id then raise exception 'Match must resolve through the supplied confirmed BuyerProfile' using errcode='23514'; end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_negotiation_identity() from public,anon,authenticated;
create trigger negotiations_identity_guard before insert or update on public.negotiations for each row execute function public.guard_negotiation_identity();

-- Match has no physical tenant column. Preserve its profile-based authority in both directions.
create function public.guard_negotiation_match_profile() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.buyer_profile_id is distinct from old.buyer_profile_id and exists(
    select 1 from public.negotiations n where n.match_id=old.id) then
    raise exception 'Referenced Match BuyerProfile is immutable' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function public.guard_negotiation_match_profile() from public,anon,authenticated;
create trigger negotiation_match_profile_guard before update of buyer_profile_id on public.vehicle_matches for each row execute function public.guard_negotiation_match_profile();

create function public.create_manual_negotiation(
  p_id text,p_tenant uuid,p_creator uuid,p_user uuid,p_responsible uuid,
  p_customer text,p_lead text,p_profile text,p_origin text
) returns text language plpgsql security invoker set search_path='' as $$
begin
  -- This function is callable only by trusted server DB roles, never Data API clients.
  perform 1 from public.tenants where id=p_tenant and status='active' for share;
  if not found then raise exception 'Tenant authorization denied' using errcode='42501'; end if;
  perform 1 from public.memberships where id=p_creator and tenant_id=p_tenant and user_id=p_user and status='active' and revoked_at is null for share;
  if not found then raise exception 'Creator authorization denied' using errcode='42501'; end if;
  perform 1 from public.role_assignments where membership_id=p_creator and status='active' and revoked_at is null and role_code in ('owner','manager','seller') for share;
  if not found then raise exception 'Creator role denied' using errcode='42501'; end if;
  perform 1 from public.memberships where id=p_responsible and tenant_id=p_tenant and status='active' and revoked_at is null for share;
  if not found then raise exception 'Responsible Membership unavailable' using errcode='42501'; end if;
  -- Assignee policy for this minimum command: an active seller RoleAssignment.
  -- Owner/manager Memberships can sell when they also have an explicit seller assignment.
  perform 1 from public.role_assignments where membership_id=p_responsible and status='active' and revoked_at is null and role_code='seller' for share;
  if not found then raise exception 'Responsible seller role denied' using errcode='42501'; end if;
  if p_origin is null or p_origin not in ('manual','whatsapp','phone','walk_in','marketplace','reactivation') then
    raise exception 'Match creation requires AP-CRM-004V and AP-CRM-005' using errcode='23514';
  end if;
  if p_id is null or p_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Textual UUID Negotiation identity required' using errcode='23514';
  end if;
  insert into public.negotiations(id,tenant_id,customer_id,lead_id,buyer_profile_id,responsible_membership_id,created_by_membership_id,origin)
    values(p_id,p_tenant,p_customer,p_lead,p_profile,p_responsible,p_creator,p_origin);
  return p_id;
end $$;
revoke all on function public.create_manual_negotiation(text,uuid,uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
