-- AP-CRM-003D: additive identity links. No fixture identity backfill.
begin;
alter table public.buyer_profiles add column customer_id text;
alter table public.buyer_profiles add constraint buyer_profiles_tenant_id_id_key unique(tenant_id,id);
alter table public.buyer_profiles add constraint buyer_profiles_customer_same_tenant_fkey
  foreign key(tenant_id,customer_id) references public.customers(tenant_id,id) on delete restrict;
create index buyer_profiles_customer_idx on public.buyer_profiles(tenant_id,customer_id);

create table public.lead_customer_links (
  lead_id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id text not null,
  foreign key(tenant_id,lead_id) references public.trade_ins(tenant_id,id) on delete restrict,
  foreign key(tenant_id,customer_id) references public.customers(tenant_id,id) on delete restrict
);
create index lead_customer_links_customer_idx on public.lead_customer_links(tenant_id,customer_id);

create table public.identity_link_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  buyer_profile_id text,
  lead_id text,
  previous_customer_id text,
  customer_id text,
  actor_membership_id uuid not null,
  confirmed_at timestamptz not null default now(),
  reason text not null check(length(btrim(reason)) between 1 and 1000),
  source text not null check(length(btrim(source)) between 1 and 100),
  transaction_id bigint not null default txid_current(),
  check(num_nonnulls(buyer_profile_id,lead_id)=1),
  check(previous_customer_id is distinct from customer_id),
  foreign key(tenant_id,buyer_profile_id) references public.buyer_profiles(tenant_id,id) on delete restrict,
  foreign key(tenant_id,lead_id) references public.trade_ins(tenant_id,id) on delete restrict,
  foreign key(tenant_id,previous_customer_id) references public.customers(tenant_id,id) on delete restrict,
  foreign key(tenant_id,customer_id) references public.customers(tenant_id,id) on delete restrict,
  foreign key(tenant_id,actor_membership_id) references public.memberships(tenant_id,id) on delete restrict
);
create index identity_link_events_profile_idx on public.identity_link_events(tenant_id,buyer_profile_id,confirmed_at);
create index identity_link_events_lead_idx on public.identity_link_events(tenant_id,lead_id,confirmed_at);
create index identity_link_events_actor_idx on public.identity_link_events(tenant_id,actor_membership_id);
create index identity_link_events_previous_customer_idx on public.identity_link_events(tenant_id,previous_customer_id);
create index identity_link_events_customer_idx on public.identity_link_events(tenant_id,customer_id);
alter table public.lead_customer_links enable row level security;
alter table public.identity_link_events enable row level security;
revoke all on public.lead_customer_links,public.identity_link_events from public,anon,authenticated;

create function public.identity_events_append_only() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'Identity history is append-only' using errcode='23514'; end $$;
create trigger identity_events_append_only before update or delete on public.identity_link_events
for each row execute function public.identity_events_append_only();

-- Require an explicit, same-transaction provenance entry for every relationship change.
create function public.identity_link_requires_event() returns trigger
language plpgsql security invoker set search_path='' as $$
declare prior text; resulting text; root_id text; scope uuid; profile_kind boolean;
begin
  profile_kind:=tg_table_name='buyer_profiles';
  if not profile_kind and tg_op='UPDATE' then
    if new.lead_id is distinct from old.lead_id then
      raise exception 'Lead identity root is immutable' using errcode='23514';
    end if;
  end if;
  if tg_op='UPDATE' and new.tenant_id is distinct from old.tenant_id then
    raise exception 'Identity origin Tenant is immutable' using errcode='23514';
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
create trigger buyer_identity_event before insert or update on public.buyer_profiles
for each row execute function public.identity_link_requires_event();
create trigger lead_identity_event before insert or update or delete on public.lead_customer_links
for each row execute function public.identity_link_requires_event();

create function public.confirm_commercial_identity(
  p_kind text,p_origin text,p_customer text,p_expected text,p_tenant uuid,
  p_membership uuid,p_user uuid,p_reason text,p_source text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare prior text; event_id uuid; root_id text;
begin
  -- Locks serialize Membership/Tenant revocation with this confirmation.
  perform 1 from public.memberships m join public.tenants t on t.id=m.tenant_id
    where m.id=p_membership and m.user_id=p_user and m.tenant_id=p_tenant
    and m.status='active' and m.revoked_at is null and t.status='active' for share of m,t;
  if not found then raise exception 'Tenant authorization denied' using errcode='42501'; end if;
  perform 1 from public.role_assignments r where r.membership_id=p_membership
    and r.status='active' and r.revoked_at is null and r.role_code in ('owner','manager','seller') for share;
  if not found then raise exception 'Tenant role denied' using errcode='42501'; end if;
  if p_kind='buyer_profile' then
    select b.id,b.customer_id into root_id,prior from public.buyer_profiles b
      where b.id=p_origin and b.tenant_id=p_tenant for update;
  elsif p_kind='lead' then
    select l.id into root_id from public.trade_ins l where l.id=p_origin and l.tenant_id=p_tenant for update;
    select c.customer_id into prior from public.lead_customer_links c where c.lead_id=p_origin and c.tenant_id=p_tenant;
  else raise exception 'Unknown identity origin' using errcode='22023'; end if;
  if root_id is null then raise exception 'Origin unavailable in authorized Tenant' using errcode='42501'; end if;
  if prior is distinct from p_expected then raise exception 'Confirmed identity changed' using errcode='40001'; end if;
  if prior is not distinct from p_customer then raise exception 'Identity unchanged' using errcode='22023'; end if;
  if p_customer is not null then
    perform 1 from public.customers c where c.id=p_customer and c.tenant_id=p_tenant for share;
    if not found then raise exception 'Customer unavailable in authorized Tenant' using errcode='42501'; end if;
  end if;
  insert into public.identity_link_events(tenant_id,buyer_profile_id,lead_id,previous_customer_id,customer_id,actor_membership_id,reason,source)
    values(p_tenant,case when p_kind='buyer_profile' then p_origin end,case when p_kind='lead' then p_origin end,prior,p_customer,p_membership,p_reason,p_source)
    returning id into event_id;
  if p_kind='buyer_profile' then
    update public.buyer_profiles set customer_id=p_customer where id=p_origin;
  elsif p_customer is null then
    delete from public.lead_customer_links where lead_id=p_origin;
  elsif prior is null then
    insert into public.lead_customer_links(lead_id,tenant_id,customer_id) values(p_origin,p_tenant,p_customer);
  else update public.lead_customer_links set customer_id=p_customer where lead_id=p_origin; end if;
  return event_id;
end $$;

-- Match inherits identity/Tenant solely through its BuyerProfile. Reconcile the missing ORM FK.
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.vehicle_matches'::regclass and conname='vehicle_matches_buyer_profile_id_fkey') then
    alter table public.vehicle_matches add constraint vehicle_matches_buyer_profile_id_fkey
      foreign key(buyer_profile_id) references public.buyer_profiles(id) on delete cascade;
  end if;
end $$;
create index if not exists vehicle_matches_buyer_profile_idx on public.vehicle_matches(buyer_profile_id);

-- Only current typed Tenant-bearing roots are checked; global catalog/legacy sources stay unchanged.
create function public.match_identity_tenant_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_table_name='vehicle_matches' then
    -- Serialize the check with ownership changes to these referenced roots.
    perform 1 from public.buyer_profiles where id=new.buyer_profile_id for share;
    if new.source_type='trade_in' then perform 1 from public.trade_ins where id=new.source_id for share; end if;
    if new.case_id is not null then perform 1 from public.commercial_cases where id=new.case_id for share; end if;
  end if;
  if exists(select 1 from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id
    left join public.trade_ins l on m.source_type='trade_in' and m.source_id=l.id
    left join public.commercial_cases c on c.id=m.case_id
    where (l.id is not null and l.tenant_id<>b.tenant_id) or (c.id is not null and c.tenant_id<>b.tenant_id)) then
    raise exception 'Match origin Tenant mismatch' using errcode='23514';
  end if;
  return null;
end $$;
create constraint trigger match_identity_tenant_guard after insert or update on public.vehicle_matches
deferrable initially immediate for each row execute function public.match_identity_tenant_guard();
create trigger profile_match_tenant_guard after update of tenant_id on public.buyer_profiles
for each row execute function public.match_identity_tenant_guard();
create trigger lead_match_tenant_guard after update of tenant_id on public.trade_ins
for each row execute function public.match_identity_tenant_guard();
create trigger case_match_tenant_guard after update of tenant_id on public.commercial_cases
for each row execute function public.match_identity_tenant_guard();
revoke all on function public.identity_events_append_only(),public.identity_link_requires_event(),
  public.match_identity_tenant_guard(),public.confirm_commercial_identity(text,text,text,text,uuid,uuid,uuid,text,text)
  from public,anon,authenticated;
-- Abort on any pre-existing incoherence before exposing the new confirmation path.
do $$ begin
  if exists(select 1 from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id
    left join public.trade_ins l on m.source_type='trade_in' and m.source_id=l.id
    left join public.commercial_cases c on c.id=m.case_id
    where (l.id is not null and l.tenant_id<>b.tenant_id) or (c.id is not null and c.tenant_id<>b.tenant_id)) then
    raise exception 'Existing Match Tenant incoherence';
  end if;
end $$;
commit;
