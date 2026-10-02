-- AP-CRM-005 ONLY: explicit retained synthetic staging fixture for two-session concurrency.
-- Run ONCE in teste2, never production. No historical roots cloned or modified.
-- Append-only provenance is retained rather than bypassing immutable guards for cleanup.
begin;
do $$
declare
  scope uuid; member uuid; actor uuid; seller uuid;
  customer text:=gen_random_uuid()::text; profile text:=gen_random_uuid()::text;
  source text:=gen_random_uuid()::text; vehicle text:=gen_random_uuid()::text; match text:=gen_random_uuid()::text;
begin
  if exists(select 1 from public.vehicle_matches where vehicle_label='AP-CRM-005 retained concurrency fixture') then raise exception 'Fixture already exists; inspect checkpoint, do not replay'; end if;
  select m.tenant_id,m.id,m.user_id into scope,member,actor from public.memberships m join public.role_assignments r on r.membership_id=m.id
    where m.status='active' and m.revoked_at is null and r.status='active' and r.revoked_at is null and r.role_code='owner'
    and exists(select 1 from public.memberships s join public.role_assignments sr on sr.membership_id=s.id where s.tenant_id=m.tenant_id and s.status='active' and s.revoked_at is null and sr.status='active' and sr.revoked_at is null and sr.role_code='seller') limit 1;
  select m.id into seller from public.memberships m join public.role_assignments r on r.membership_id=m.id where m.tenant_id=scope and m.status='active' and m.revoked_at is null and r.role_code='seller' and r.status='active' and r.revoked_at is null limit 1;
  if scope is null or seller is null then raise exception 'Active homologation Tenant/owner/seller absent'; end if;
  insert into public.customers(id,tenant_id,name) values(customer,scope,'AP-CRM-005 synthetic concurrency Customer');
  insert into public.buyer_profiles(id,tenant_id,name,whatsapp,email,city,budget_max,consent_at)
    values(profile,scope,'AP-CRM-005 synthetic concurrency BuyerProfile','','','',0,'AP005 staging fixture');
  insert into public.trade_ins(id,tenant_id,name,whatsapp,email,city,brand,model,version,year,mileage,condition,reference_price,estimated_min,estimated_max,photo_keys,consent_at)
    values(source,scope,'AP-CRM-005 synthetic offered vehicle','','','','','','','',0,'',0,0,0,'[]','AP005 staging fixture');
  perform public.confirm_commercial_identity('buyer_profile',profile,customer,null,scope,member,actor,'Explicit AP005 synthetic fixture identity','AP005_staging_fixture');
  perform public.register_tenant_vehicle(vehicle,scope,member,actor,null,'available','Explicit AP005 synthetic physical vehicle; technical identity unresolved');
  perform public.confirm_tenant_vehicle_source(scope,member,actor,vehicle,'trade_in',source,'Explicit AP005 synthetic source confirmation; no historical mapping');
  insert into public.vehicle_matches(id,buyer_profile_id,source_type,source_id,vehicle_label,score)
    values(match,profile,'trade_in',source,'AP-CRM-005 retained concurrency fixture',70);
  perform set_config('ap005.fixture',jsonb_build_object('tenantId',scope,'creatorMembershipId',member,'authenticatedUserId',actor,'responsibleMembershipId',seller,
    'customerId',customer,'buyerProfileId',profile,'sourceId',source,'tenantVehicleId',vehicle,'matchId',match)::text,true);
end $$;
select current_setting('ap005.fixture')::jsonb as fixture;
commit;
