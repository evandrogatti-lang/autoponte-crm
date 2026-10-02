-- AP-CRM-004: retain observed supporting identity confirmations on the root.
-- Empty-table preflight; no backfill or changes to the Tenant/identity foundation.
alter table public.negotiations
  add column buyer_profile_identity_event_id uuid references public.identity_link_events(id) on delete restrict,
  add column lead_identity_event_id uuid references public.identity_link_events(id) on delete restrict;
alter table public.negotiations add constraint negotiations_identity_provenance_check check(
  (buyer_profile_id is null) = (buyer_profile_identity_event_id is null) and
  (lead_id is null) = (lead_identity_event_id is null));
create index negotiations_profile_event_idx on public.negotiations(buyer_profile_identity_event_id);
create index negotiations_lead_event_idx on public.negotiations(lead_identity_event_id);

create or replace function public.guard_negotiation_identity() returns trigger
language plpgsql security invoker set search_path='' as $$
declare confirmed text; profile text;
begin
  if tg_op='UPDATE' then
    if row(new.id,new.tenant_id,new.customer_id,new.lead_id,new.buyer_profile_id,new.match_id,new.origin,new.created_by_membership_id,new.created_at,new.buyer_profile_identity_event_id,new.lead_identity_event_id)
      is distinct from row(old.id,old.tenant_id,old.customer_id,old.lead_id,old.buyer_profile_id,old.match_id,old.origin,old.created_by_membership_id,old.created_at,old.buyer_profile_identity_event_id,old.lead_identity_event_id) then
      raise exception 'Negotiation creation identity/provenance is immutable; correction requires a future audited command' using errcode='23514';
    end if;
    new.updated_at := greatest(clock_timestamp(),new.created_at);
    return new;
  end if;
  perform 1 from public.customers where id=new.customer_id and tenant_id=new.tenant_id for share;
  if not found then raise exception 'Customer unavailable in Negotiation Tenant' using errcode='23503'; end if;
  new.buyer_profile_identity_event_id := null;
  new.lead_identity_event_id := null;
  if new.buyer_profile_id is not null then
    select customer_id into confirmed from public.buyer_profiles where id=new.buyer_profile_id and tenant_id=new.tenant_id for share;
    if not found then raise exception 'BuyerProfile unavailable in Negotiation Tenant' using errcode='23503'; end if;
    if confirmed is null then raise exception 'UNRESOLVED BuyerProfile identity' using errcode='23514'; end if;
    if confirmed <> new.customer_id then raise exception 'CONFLICT BuyerProfile identity' using errcode='23514'; end if;
    select e.id into new.buyer_profile_identity_event_id from public.identity_link_events e
      where e.tenant_id=new.tenant_id and e.buyer_profile_id=new.buyer_profile_id and e.customer_id=new.customer_id
      order by e.transaction_id desc,e.confirmed_at desc,e.id desc limit 1;
    if not found then raise exception 'BuyerProfile confirmation provenance unavailable' using errcode='23514'; end if;
  end if;
  if new.lead_id is not null then
    perform 1 from public.trade_ins where id=new.lead_id and tenant_id=new.tenant_id for share;
    if not found then raise exception 'Lead unavailable in Negotiation Tenant' using errcode='23503'; end if;
    select customer_id into confirmed from public.lead_customer_links where lead_id=new.lead_id and tenant_id=new.tenant_id;
    if not found then raise exception 'UNRESOLVED Lead identity' using errcode='23514'; end if;
    if confirmed <> new.customer_id then raise exception 'CONFLICT Lead identity' using errcode='23514'; end if;
    select e.id into new.lead_identity_event_id from public.identity_link_events e
      where e.tenant_id=new.tenant_id and e.lead_id=new.lead_id and e.customer_id=new.customer_id
      order by e.transaction_id desc,e.confirmed_at desc,e.id desc limit 1;
    if not found then raise exception 'Lead confirmation provenance unavailable' using errcode='23514'; end if;
  end if;
  if new.match_id is not null then
    select buyer_profile_id into profile from public.vehicle_matches where id=new.match_id for share;
    if not found then raise exception 'Match unavailable' using errcode='23503'; end if;
    if profile is distinct from new.buyer_profile_id then raise exception 'Match must resolve through the supplied confirmed BuyerProfile' using errcode='23514'; end if;
  end if;
  return new;
end $$;
-- CREATE OR REPLACE preserves 0028's revoked client execution privileges.
