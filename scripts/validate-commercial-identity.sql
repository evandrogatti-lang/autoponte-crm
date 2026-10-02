-- teste2 only. Synthetic confirmation probes; every write is rolled back.
begin;
create temporary table identity_business_before as
select 'profiles' as entity, md5(string_agg((to_jsonb(b)-'customer_id')::text,'|' order by id)) as hash from public.buyer_profiles b
union all select 'leads',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.trade_ins b
union all select 'customers',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.customers b
union all select 'cases',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.commercial_cases b
union all select 'matches',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.vehicle_matches b;

do $$
declare scope uuid; actor uuid; actor_user uuid; profile text; lead text; first_customer text; second_customer text; event_id uuid; count_before bigint;
begin
  select m.tenant_id,m.id,m.user_id into scope,actor,actor_user from public.memberships m
    join public.tenants t on t.id=m.tenant_id
    where m.status='active' and m.revoked_at is null and t.status='active'
    and exists(select 1 from public.role_assignments r where r.membership_id=m.id and r.status='active' and r.revoked_at is null)
    order by m.id limit 1;
  select id into profile from public.buyer_profiles where tenant_id=scope and customer_id is null order by id limit 1;
  select id into lead from public.trade_ins l where tenant_id=scope and not exists(select 1 from public.lead_customer_links c where c.lead_id=l.id) order by id limit 1;
  select id into first_customer from public.customers where tenant_id=scope order by id limit 1;
  select id into second_customer from public.customers where tenant_id=scope and id<>first_customer order by id limit 1;
  if num_nonnulls(scope,actor,actor_user,profile,lead,first_customer,second_customer)<>7 then raise exception 'Missing identity validation prerequisites'; end if;
  select count(*) into count_before from public.identity_link_events;

  event_id:=public.confirm_commercial_identity('buyer_profile',profile,first_customer,null,scope,actor,actor_user,'Explicit rollback-only test confirmation','AP-CRM-003D-validation');
  if not exists(select 1 from public.buyer_profiles where id=profile and tenant_id=scope and customer_id=first_customer) then raise exception 'Profile positive link failed'; end if;
  perform public.confirm_commercial_identity('lead',lead,first_customer,null,scope,actor,actor_user,'Explicit rollback-only test confirmation','AP-CRM-003D-validation');
  if not exists(select 1 from public.lead_customer_links where lead_id=lead and tenant_id=scope and customer_id=first_customer) then raise exception 'Lead positive mapping failed'; end if;
  -- Same provenance exists in this transaction; the Lead PK must still reject duplicates.
  begin
    insert into public.lead_customer_links values(lead,scope,first_customer);
    raise exception 'Duplicate current Lead identity accepted';
  exception when unique_violation then null; end;
  begin
    perform public.confirm_commercial_identity('lead',lead,second_customer,null,scope,actor,actor_user,'Stale expectation','AP-CRM-003D-validation');
    raise exception 'Stale reassignment accepted';
  exception when serialization_failure then null; end;

  perform public.confirm_commercial_identity('buyer_profile',profile,second_customer,first_customer,scope,actor,actor_user,'Correct confirmed identity','AP-CRM-003D-validation');
  if not exists(select 1 from public.identity_link_events where id=event_id and previous_customer_id is null and customer_id=first_customer and actor_membership_id=actor and confirmed_at is not null)
    or not exists(select 1 from public.identity_link_events where buyer_profile_id=profile and previous_customer_id=first_customer and customer_id=second_customer and reason='Correct confirmed identity') then raise exception 'Correction history missing'; end if;
  begin
    update public.identity_link_events set reason='rewrite' where id=event_id;
    raise exception 'History rewrite accepted';
  exception when check_violation then null; end;
  begin
    delete from public.identity_link_events where id=event_id;
    raise exception 'History deletion accepted';
  exception when check_violation then null; end;

  -- A separate Tenant and Customer exist only inside this rolled-back transaction.
  insert into public.tenants(id,name,status) values('ecce0000-0000-4000-8000-000000000003','Identity rollback probe','active');
  insert into public.customers(id,tenant_id,name) values('ap-crm-003d-cross-tenant-probe','ecce0000-0000-4000-8000-000000000003','Identity rollback probe');
  begin
    perform public.confirm_commercial_identity('buyer_profile',profile,'ap-crm-003d-cross-tenant-probe',second_customer,scope,actor,actor_user,'Cross Tenant probe','AP-CRM-003D-validation');
    raise exception 'Cross-Tenant profile confirmation accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.confirm_commercial_identity('lead',lead,'ap-crm-003d-cross-tenant-probe',first_customer,scope,actor,actor_user,'Cross Tenant probe','AP-CRM-003D-validation');
    raise exception 'Cross-Tenant Lead confirmation accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.identity_link_events(tenant_id,buyer_profile_id,previous_customer_id,customer_id,actor_membership_id,reason,source)
      values(scope,profile,second_customer,'ap-crm-003d-cross-tenant-probe',actor,'Cross Tenant FK probe','AP-CRM-003D-validation');
    raise exception 'Cross-Tenant Customer FK accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.lead_customer_links(tenant_id,lead_id,customer_id)
      values('ecce0000-0000-4000-8000-000000000003',lead,'ap-crm-003d-cross-tenant-probe');
    raise exception 'Cross-Tenant Lead root accepted';
  exception when check_violation or foreign_key_violation then null; end;
  begin
    perform public.confirm_commercial_identity('lead',lead,second_customer,first_customer,scope,actor,'00000000-0000-4000-8000-000000000000','Wrong User','AP-CRM-003D-validation');
    raise exception 'Wrong User accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.buyer_profiles set customer_id=first_customer where id=profile;
    raise exception 'Unaudited correction accepted';
  exception when check_violation then null; end;

  -- Match never carries Customer authority: resolution follows the profile.
  insert into public.vehicle_matches(id,buyer_profile_id,source_type,source_id,vehicle_label,score)
    values('ap-crm-003d-match-probe',profile,'trade_in',lead,'Rollback probe',0);
  insert into public.buyer_profiles
    select (jsonb_populate_record(null::public.buyer_profiles,to_jsonb(b)||jsonb_build_object('id','ap-crm-003d-profile-probe','tenant_id','ecce0000-0000-4000-8000-000000000003','customer_id',null))).*
    from public.buyer_profiles b where id=profile;
  begin
    update public.vehicle_matches set buyer_profile_id='ap-crm-003d-profile-probe' where id='ap-crm-003d-match-probe';
    raise exception 'Cross-Tenant Match source accepted';
  exception when check_violation then null; end;
  begin
    update public.trade_ins set tenant_id='ecce0000-0000-4000-8000-000000000003' where id=lead;
    raise exception 'Cross-Tenant linked Lead ownership accepted';
  exception when check_violation or foreign_key_violation then null; end;
  if not exists(select 1 from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id where m.id='ap-crm-003d-match-probe' and b.tenant_id=scope and b.customer_id=second_customer) then raise exception 'Match Customer path failed'; end if;
  if not exists(select 1 from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id join public.lead_customer_links l on l.lead_id=m.source_id where m.id='ap-crm-003d-match-probe' and b.customer_id<>l.customer_id) then raise exception 'Confirmed conflict fixture missing'; end if;
  begin
    update public.vehicle_matches set buyer_profile_id='missing-profile' where id='ap-crm-003d-match-probe';
    raise exception 'Missing profile FK accepted';
  exception when foreign_key_violation then null; end;
  perform public.confirm_commercial_identity('buyer_profile',profile,null,second_customer,scope,actor,actor_user,'Withdraw mistaken confirmation','AP-CRM-003D-validation');
  if not exists(select 1 from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id where m.id='ap-crm-003d-match-probe' and b.customer_id is null) then raise exception 'Unresolved Match no longer unknown'; end if;
  perform public.confirm_commercial_identity('lead',lead,null,first_customer,scope,actor,actor_user,'Withdraw mistaken confirmation','AP-CRM-003D-validation');
  if exists(select 1 from public.lead_customer_links where lead_id=lead) then raise exception 'Lead withdrawal failed'; end if;
  if (select count(*) from public.identity_link_events)<>count_before+5 then raise exception 'Unexpected provenance event count'; end if;

  -- Remove only local probe rows, then compare all original business columns.
  delete from public.vehicle_matches where id='ap-crm-003d-match-probe';
  delete from public.buyer_profiles where id='ap-crm-003d-profile-probe';
  delete from public.customers where id='ap-crm-003d-cross-tenant-probe';
  delete from public.tenants where id='ecce0000-0000-4000-8000-000000000003';
  if exists(select * from identity_business_before except
    (select 'profiles',md5(string_agg((to_jsonb(b)-'customer_id')::text,'|' order by id)) from public.buyer_profiles b
    union all select 'leads',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.trade_ins b
    union all select 'customers',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.customers b
    union all select 'cases',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.commercial_cases b
    union all select 'matches',md5(string_agg(to_jsonb(b)::text,'|' order by id)) from public.vehicle_matches b)) then raise exception 'Business columns changed'; end if;
end $$;
rollback;
select 'PASS: identity constraints, confirmation, correction history, Match path and business hashes; all probe writes rolled back' as validation;
