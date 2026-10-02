-- AP-CRM-005 rollback-only gates, run in teste2 as trusted server role after 0032.
begin;
do $$
declare
  scope uuid; member uuid; actor uuid; seller uuid; other_scope uuid; other_member uuid; other_actor uuid;
  customer text:=gen_random_uuid()::text; alternate text:=gen_random_uuid()::text; foreign_customer text:=gen_random_uuid()::text;
  profile text:=gen_random_uuid()::text; unknown_profile text:=gen_random_uuid()::text; other_profile text:=gen_random_uuid()::text;
  source text:=gen_random_uuid()::text; lead text:=gen_random_uuid()::text; unknown_source text:=gen_random_uuid()::text;
  vehicle text:=gen_random_uuid()::text; foreign_vehicle text:=gen_random_uuid()::text;
  match text:=gen_random_uuid()::text; unknown_match text:=gen_random_uuid()::text; unmapped_match text:=gen_random_uuid()::text; foreign_match text:=gen_random_uuid()::text;
  first record; repeated record; scenario record; actual text; actual_hint text; violated_constraint text; count_rejected integer:=0; baseline text;
begin
  select m.tenant_id,m.id,m.user_id into scope,member,actor from public.memberships m join public.role_assignments r on r.membership_id=m.id
    where m.status='active' and m.revoked_at is null and r.status='active' and r.revoked_at is null and r.role_code='owner'
    and exists(select 1 from public.memberships s join public.role_assignments sr on sr.membership_id=s.id where s.tenant_id=m.tenant_id and s.status='active' and sr.status='active' and sr.role_code='seller') limit 1;
  select m.id into seller from public.memberships m join public.role_assignments r on r.membership_id=m.id where m.tenant_id=scope and m.status='active' and r.role_code='seller' and r.status='active' limit 1;
  select m.tenant_id,m.id,m.user_id into other_scope,other_member,other_actor from public.memberships m join public.role_assignments r on r.membership_id=m.id where m.tenant_id<>scope and m.status='active' and r.role_code='owner' and r.status='active' limit 1;
  if scope is null or seller is null or other_scope is null then raise exception 'Probe prerequisites absent'; end if;
  select md5(string_agg(row_to_json(m)::text,'' order by id)) into baseline from public.vehicle_matches m;
  insert into public.customers(id,tenant_id,name) values(customer,scope,'AP005 rollback Customer'),(alternate,scope,'AP005 rollback alternate'),(foreign_customer,other_scope,'AP005 rollback foreign');
  insert into public.buyer_profiles(id,tenant_id,name,whatsapp,email,city,budget_max,consent_at)
    values(profile,scope,'AP005 rollback','','','',0,'rollback'),(unknown_profile,scope,'AP005 unresolved','','','',0,'rollback'),(other_profile,other_scope,'AP005 foreign','','','',0,'rollback');
  insert into public.trade_ins(id,tenant_id,name,whatsapp,email,city,brand,model,version,year,mileage,condition,reference_price,estimated_min,estimated_max,photo_keys,consent_at)
    values(source,scope,'AP005 offered vehicle','','','','','','','',0,'',0,0,0,'[]','rollback'),
      (lead,scope,'AP005 buyer demand','','','','','','','',0,'',0,0,0,'[]','rollback'),
      (unknown_source,scope,'AP005 unmapped','','','','','','','',0,'',0,0,0,'[]','rollback');
  perform public.confirm_commercial_identity('buyer_profile',profile,customer,null,scope,member,actor,'Explicit rollback identity','AP005_probe');
  perform public.confirm_commercial_identity('lead',lead,customer,null,scope,member,actor,'Explicit rollback buyer identity','AP005_probe');
  perform public.register_tenant_vehicle(vehicle,scope,member,actor,null,'available','Explicit rollback physical vehicle');
  perform public.register_tenant_vehicle(foreign_vehicle,other_scope,other_member,other_actor,null,'available','Explicit rollback foreign vehicle');
  perform public.confirm_tenant_vehicle_source(scope,member,actor,vehicle,'trade_in',source,'Explicit rollback source review');
  insert into public.vehicle_matches(id,buyer_profile_id,source_type,source_id,vehicle_label,score)
    values(match,profile,'trade_in',source,'AP005 canonical fixture',70),
      (unknown_match,unknown_profile,'trade_in',source,'AP005 unresolved Customer',0),
      (unmapped_match,profile,'trade_in',unknown_source,'AP005 unresolved vehicle',0),
      (foreign_match,other_profile,'unsupported','unmapped','AP005 foreign',0);
  select * into first from public.start_negotiation_from_match(gen_random_uuid()::text,scope,member,actor,seller,match,lead);
  select * into repeated from public.start_negotiation_from_match(gen_random_uuid()::text,scope,member,actor,seller,match,lead);
  if not first.created or repeated.created or first.negotiation_id<>repeated.negotiation_id then raise exception 'Idempotent return failed'; end if;
  if not exists(select 1 from public.negotiations n where n.id=first.negotiation_id and n.tenant_id=scope and n.customer_id=customer and n.buyer_profile_id=profile
    and n.lead_id=lead and n.match_id=match and n.tenant_vehicle_id=vehicle and n.created_by_membership_id=member and n.responsible_membership_id=seller
    and n.origin='match_manual' and n.stage='contact' and n.lifecycle='active' and n.buyer_profile_identity_event_id is not null and n.lead_identity_event_id is not null) then raise exception 'Persisted references/provenance failed'; end if;
  for scenario in select * from (values
    ('unresolved Customer',format('select * from public.start_negotiation_from_match(%L,%L,%L,%L,%L,%L,null)',gen_random_uuid()::text,scope,member,actor,seller,unknown_match),'23514','UNRESOLVED_CUSTOMER'),
    ('unresolved vehicle',format('select * from public.start_negotiation_from_match(%L,%L,%L,%L,%L,%L,null)',gen_random_uuid()::text,scope,member,actor,seller,unmapped_match),'23514','UNRESOLVED_VEHICLE'),
    ('unresolved buyer Lead',format('select * from public.start_negotiation_from_match(%L,%L,%L,%L,%L,%L,%L)',gen_random_uuid()::text,scope,member,actor,seller,match,unknown_source),'23514','UNRESOLVED_CUSTOMER'),
    ('foreign Match/Profile',format('select * from public.start_negotiation_from_match(%L,%L,%L,%L,%L,%L,null)',gen_random_uuid()::text,scope,member,actor,seller,foreign_match),'42501',null),
    ('foreign Membership',format('select * from public.start_negotiation_from_match(%L,%L,%L,%L,%L,%L,null)',gen_random_uuid()::text,scope,member,actor,other_member,match),'42501',null),
    ('forged authenticated User',format('select * from public.start_negotiation_from_match(%L,%L,%L,%L,%L,%L,null)',gen_random_uuid()::text,scope,member,gen_random_uuid(),seller,match),'42501',null),
    ('foreign Customer FK',format('insert into public.negotiations(id,tenant_id,customer_id,responsible_membership_id,created_by_membership_id,origin) values(%L,%L,%L,%L,%L,''manual'')',gen_random_uuid()::text,scope,foreign_customer,seller,member),'23503',null),
    ('foreign vehicle FK',format('insert into public.negotiations(id,tenant_id,customer_id,tenant_vehicle_id,responsible_membership_id,created_by_membership_id,origin) values(%L,%L,%L,%L,%L,%L,''manual'')',gen_random_uuid()::text,scope,customer,foreign_vehicle,seller,member),'23503',null),
    ('immutable persisted vehicle',format('update public.negotiations set tenant_vehicle_id=null where id=%L',first.negotiation_id),'23514',null),
    ('Match source retargeting',format('update public.vehicle_matches set source_id=%L where id=%L',unknown_source,match),'23514',null),
    ('duplicate DB backstop',format('insert into public.negotiations select (jsonb_populate_record(null::public.negotiations,to_jsonb(n)||jsonb_build_object(''id'',%L))).* from public.negotiations n where id=%L',gen_random_uuid()::text,first.negotiation_id),'23505',null),
    ('changed Lead retry',format('select * from public.start_negotiation_from_match(%L,%L,%L,%L,%L,%L,null)',gen_random_uuid()::text,scope,member,actor,seller,match),'23514','NEGOTIATION_CONFLICT')
  ) cases(label,statement,expected,hint) loop
    actual:=null; actual_hint:=null; violated_constraint:=null;
    begin execute scenario.statement;
    exception when others then get stacked diagnostics actual=returned_sqlstate,actual_hint=pg_exception_hint,violated_constraint=constraint_name; end;
    if actual is distinct from scenario.expected or (scenario.hint is not null and actual_hint is distinct from scenario.hint) then raise exception 'Probe % expected %/%, got %/%',scenario.label,scenario.expected,scenario.hint,actual,actual_hint; end if;
    if scenario.label='duplicate DB backstop' and violated_constraint is distinct from 'negotiations_active_match_key' then raise exception 'Duplicate was not rejected by canonical partial index'; end if;
    count_rejected:=count_rejected+1;
  end loop;
  -- Each failing subtransaction restores the simulated revocation/correction/state.
  for scenario in select * from (values
    ('conflicting buyer Lead',format('select public.confirm_commercial_identity(''lead'',%L,%L,%L,%L,%L,%L,''Rollback correction'',''AP005_probe'')',lead,alternate,customer,scope,member,actor),'23514','CONFLICT_CUSTOMER'),
    ('unavailable vehicle',format('update public.tenant_vehicles set status=''unavailable'' where id=%L',vehicle),'23514','VEHICLE_UNAVAILABLE'),
    ('inactive creator',format('update public.memberships set status=''suspended'' where id=%L',member),'42501',null),
    ('inactive assignee',format('update public.memberships set status=''suspended'' where id=%L',seller),'42501',null),
    ('revoked seller role',format('update public.role_assignments set status=''revoked'',revoked_at=now() where membership_id=%L',seller),'42501',null),
    ('closed retry',format('update public.negotiations set lifecycle=''closed'',closed_at=clock_timestamp(),closure_reason=''lost'' where id=%L',first.negotiation_id),'23514','NEGOTIATION_CONFLICT')
  ) cases(label,mutation,expected,hint) loop
    actual:=null; actual_hint:=null;
    begin execute scenario.mutation;
      perform public.start_negotiation_from_match(gen_random_uuid()::text,scope,member,actor,seller,match,lead);
    exception when others then get stacked diagnostics actual=returned_sqlstate,actual_hint=pg_exception_hint; end;
    if actual is distinct from scenario.expected or (scenario.hint is not null and actual_hint is distinct from scenario.hint) then raise exception 'Probe % expected %/%, got %/%',scenario.label,scenario.expected,scenario.hint,actual,actual_hint; end if;
    count_rejected:=count_rejected+1;
  end loop;
  -- Stage/formalization changes are constraint probes; no Case handoff implemented.
  update public.negotiations set lifecycle='formalized',formalized_at=clock_timestamp() where id=first.negotiation_id;
  select * into repeated from public.start_negotiation_from_match(gen_random_uuid()::text,scope,member,actor,seller,match,lead);
  if repeated.created or repeated.negotiation_id<>first.negotiation_id then raise exception 'Formalized retry failed'; end if;
  perform public.create_manual_negotiation(gen_random_uuid()::text,scope,member,actor,seller,customer,null,null,'manual');
  if not exists(select 1 from public.negotiations where tenant_id=scope and customer_id=customer and origin='manual' and tenant_vehicle_id is null) then raise exception 'Manual qualification regressed'; end if;
  if count_rejected<>18 then raise exception 'Rejection count %',count_rejected; end if;
  if not exists(select 1 from pg_index where indexrelid='public.negotiations_active_match_key'::regclass and indisunique and indisvalid and indisready) then raise exception 'Database uniqueness absent/invalid'; end if;
  if has_function_privilege('authenticated','public.start_negotiation_from_match(text,uuid,uuid,uuid,uuid,text,text)','EXECUTE') or
    has_function_privilege('anon','public.resolve_match_vehicle(uuid,text)','EXECUTE') then raise exception 'Client execution leaked'; end if;
  if (select md5(string_agg(row_to_json(m)::text,'' order by id)) from public.vehicle_matches m where id not in(match,unknown_match,unmapped_match,foreign_match))<>baseline then raise exception 'Historical Match mutation'; end if;
end $$;
select 'PASS: canonical creation/identity provenance, repeat/formalized return, 18 rejection gates, manual qualification, immutable sources, partial uniqueness, historic Matches unchanged; rollback' result;
rollback;
