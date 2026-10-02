-- AP-CRM-004V rollback-only staging probes, trusted server DB role.
begin;
do $$
declare
  scope uuid; other_scope uuid; member uuid; actor uuid; other_member uuid; other_actor uuid; seller uuid;
  vehicle text := gen_random_uuid()::text; other_vehicle text := gen_random_uuid()::text;
  specification text := gen_random_uuid()::text; reviewed_vehicle text := gen_random_uuid()::text;
  legacy text; demand text; unmapped_demand text := gen_random_uuid()::text; foreign_demand text := gen_random_uuid()::text;
  consignment text := gen_random_uuid()::text; foreign_profile text := gen_random_uuid()::text;
  foreign_match text := gen_random_uuid()::text; original_match text;
  base text; link_base text; scenario record; actual text; rejected integer := 0;
begin
  select m.tenant_id,m.id,m.user_id into scope,member,actor from public.memberships m join public.role_assignments r on r.membership_id=m.id where m.status='active' and r.status='active' and r.role_code='owner' and exists(select 1 from public.buyer_profiles b where b.tenant_id=m.tenant_id) order by m.tenant_id limit 1;
  select m.tenant_id,m.id,m.user_id into other_scope,other_member,other_actor from public.memberships m join public.role_assignments r on r.membership_id=m.id where m.tenant_id<>scope and m.status='active' and r.status='active' and r.role_code='owner' limit 1;
  select m.id into seller from public.memberships m join public.role_assignments r on r.membership_id=m.id where m.tenant_id=scope and m.status='active' and r.status='active' and r.role_code='seller' limit 1;
  select m.id,m.source_id into original_match,legacy from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id where b.tenant_id=scope and m.source_type='inventory' and m.vehicle_id=m.source_id limit 1;
  select id into demand from public.trade_ins where tenant_id=scope limit 1;
  if scope is null or other_scope is null or seller is null or legacy is null or demand is null then raise exception 'Probe prerequisites absent'; end if;
  if exists(select 1 from public.tenant_vehicle_source_links) then raise exception 'Expected empty mapping preflight'; end if;
  perform public.register_tenant_vehicle(vehicle,scope,member,actor,null,'available','Explicit rollback-only physical ownership review');
  perform public.register_tenant_vehicle(other_vehicle,other_scope,other_member,other_actor,null,'qualification','Explicit rollback-only foreign ownership review');
  if not exists(select 1 from public.tenant_vehicles where id=vehicle and tenant_id=scope and vehicle_specification_id is null and status='available') then raise exception 'Nullable technical identity/create/read failed'; end if;
  insert into public.vehicle_specifications(id,brand,model,model_year,evidence_source,evidence_reference) values(specification,'Rollback technical brand','Rollback technical model',2020,'rollback-reviewed technical reference','test://reviewed-technical-identity');
  perform public.register_tenant_vehicle(reviewed_vehicle,scope,member,actor,specification,'qualification','Reviewed specification reference fixture');
  if not exists(select 1 from public.tenant_vehicles where id=reviewed_vehicle and vehicle_specification_id=specification) then raise exception 'Global specification FK failed'; end if;
  perform public.confirm_tenant_vehicle_source(scope,member,actor,vehicle,'inventory',legacy,'Explicit rollback-only inventory ownership confirmation');
  perform public.confirm_tenant_vehicle_source(scope,member,actor,vehicle,'trade_in',demand,'Explicit rollback-only trade-in confirmation');
  insert into public.consignments(id,access_token_hash,owner_name,whatsapp,email,city,vehicle_name,year,mileage,asking_price,minimum_price,consent_at)
    values(consignment,'rollback-token','rollback fixture','','','','rollback vehicle','2020',0,0,0,'rollback consent');
  perform public.confirm_tenant_vehicle_source(scope,member,actor,vehicle,'consignment',consignment,'Explicit rollback-only consignment ownership confirmation');
  -- Current inventory Match resolves through the confirmed source, without mutation.
  if not exists(select 1 from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id
    join public.tenant_vehicle_source_links l on l.inventory_vehicle_id=m.source_id and l.tenant_id=b.tenant_id
    join public.tenant_vehicles v on v.id=l.tenant_vehicle_id and v.tenant_id=l.tenant_id
    where m.id=original_match and v.id=vehicle and v.status='available' and v.vehicle_specification_id is null) then raise exception 'Actionable Match resolution failed'; end if;
  insert into public.trade_ins select (jsonb_populate_record(null::public.trade_ins,to_jsonb(l)||jsonb_build_object('id',foreign_demand,'tenant_id',other_scope))).* from public.trade_ins l where l.id=demand;
  insert into public.trade_ins select (jsonb_populate_record(null::public.trade_ins,to_jsonb(l)||jsonb_build_object('id',unmapped_demand))).* from public.trade_ins l where l.id=demand;
  insert into public.buyer_profiles select (jsonb_populate_record(null::public.buyer_profiles,to_jsonb(b)||jsonb_build_object('id',foreign_profile,'tenant_id',other_scope,'customer_id',null))).* from public.buyer_profiles b where b.tenant_id=scope limit 1;
  insert into public.vehicle_matches(id,buyer_profile_id,source_type,source_id,vehicle_id,vehicle_label,score)
    values(foreign_match,foreign_profile,'inventory',legacy,legacy,'Rollback foreign Match',0);
  if exists(select 1 from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id
    join public.tenant_vehicle_source_links l on l.inventory_vehicle_id=m.source_id and l.tenant_id=b.tenant_id
    join public.tenant_vehicles v on v.id=l.tenant_vehicle_id and v.tenant_id=l.tenant_id where m.id=foreign_match) then raise exception 'Cross-Tenant Match resolved'; end if;
  base := format('insert into public.tenant_vehicles(id,tenant_id,created_by_membership_id,registration_reason) values(%L,%L,%L,''reviewed'')',gen_random_uuid()::text,scope,member);
  link_base := format('insert into public.tenant_vehicle_source_links(tenant_id,tenant_vehicle_id,trade_in_id,confirmed_by_membership_id,reason) values(%L,%L,%L,%L,''reviewed'')',scope,vehicle,unmapped_demand,member);
  for scenario in select * from (values
    ('required Tenant',replace(base,quote_literal(scope),'null'),'23502'),
    ('required actor',replace(base,quote_literal(member),'null'),'23502'),
    ('foreign creator FK',replace(base,quote_literal(member),quote_literal(other_member)),'23503'),
    ('invalid specification FK',format('update public.tenant_vehicles set vehicle_specification_id=''missing'' where id=%L',vehicle),'23503'),
    ('immutable ownership',format('update public.tenant_vehicles set tenant_id=%L where id=%L',other_scope,vehicle),'23514'),
    ('immutable creator',format('update public.tenant_vehicles set created_by_membership_id=%L where id=%L',seller,vehicle),'23514'),
    ('invalid status',format('update public.tenant_vehicles set status=''sold'' where id=%L',vehicle),'23514'),
    ('foreign mapped vehicle FK',replace(link_base,quote_literal(vehicle),quote_literal(other_vehicle)),'23503'),
    ('foreign mapping actor FK',replace(link_base,quote_literal(member),quote_literal(other_member)),'23503'),
    ('foreign trade-in FK',replace(link_base,quote_literal(unmapped_demand),quote_literal(foreign_demand)),'23503'),
    ('duplicate mapping',replace(link_base,quote_literal(unmapped_demand),quote_literal(demand)),'23505'),
    ('immutable mapping',format('update public.tenant_vehicle_source_links set reason=''rewrite'' where tenant_vehicle_id=%L',vehicle),'23514'),
    ('mapping deletion',format('delete from public.tenant_vehicle_source_links where tenant_vehicle_id=%L',vehicle),'23514'),
    ('foreign vehicle command',format('select public.confirm_tenant_vehicle_source(%L,%L,%L,%L,''inventory'',%L,''reviewed'')',scope,member,actor,other_vehicle,legacy),'42501'),
    ('foreign actor command',format('select public.register_tenant_vehicle(%L,%L,%L,%L,null,''available'',''reviewed'')',gen_random_uuid()::text,scope,other_member,other_actor),'42501'),
    ('wrong authenticated User',format('select public.register_tenant_vehicle(%L,%L,%L,%L,null,''available'',''reviewed'')',gen_random_uuid()::text,scope,member,gen_random_uuid()),'42501'),
    ('seller registration denied',format('select public.register_tenant_vehicle(%L,%L,%L,%L,null,''available'',''reviewed'')',gen_random_uuid()::text,scope,seller,(select user_id from public.memberships where id=seller)),'42501'),
    ('unknown inventory source',format('select public.confirm_tenant_vehicle_source(%L,%L,%L,%L,''inventory'',''missing'',''reviewed'')',scope,member,actor,vehicle),'23503'),
    ('foreign trade-in command',format('select public.confirm_tenant_vehicle_source(%L,%L,%L,%L,''trade_in'',%L,''reviewed'')',scope,member,actor,vehicle,foreign_demand),'23503'),
    ('unsupported source',format('select public.confirm_tenant_vehicle_source(%L,%L,%L,%L,''fipe'',''evidence'',''reviewed'')',scope,member,actor,vehicle),'23514'),
    ('blank ownership review',format('select public.register_tenant_vehicle(%L,%L,%L,%L,null,''available'','''')',gen_random_uuid()::text,scope,member,actor),'23514'),
    ('missing technical evidence',format('insert into public.vehicle_specifications(id,brand,model,model_year,evidence_source,evidence_reference) values(%L,''brand'',''model'',2020,'''','''')',gen_random_uuid()::text),'23514'),
    ('conflicting global source mapping',format('select public.confirm_tenant_vehicle_source(%L,%L,%L,%L,''inventory'',%L,''separate explicit review'')',other_scope,other_member,other_actor,other_vehicle,legacy),'23505'),
    ('missing typed source',format('insert into public.tenant_vehicle_source_links(tenant_id,tenant_vehicle_id,confirmed_by_membership_id,reason) values(%L,%L,%L,''reviewed'')',scope,vehicle,member),'23514'),
    ('multiple typed sources',format('insert into public.tenant_vehicle_source_links(tenant_id,tenant_vehicle_id,inventory_vehicle_id,trade_in_id,confirmed_by_membership_id,reason) values(%L,%L,%L,%L,%L,''reviewed'')',scope,vehicle,legacy,demand,member),'23514')
  ) as cases(label,statement,expected) loop
    actual := null;
    begin execute scenario.statement;
    exception when others then get stacked diagnostics actual=returned_sqlstate; end;
    if actual is distinct from scenario.expected then raise exception 'Probe % expected %, got %',scenario.label,scenario.expected,actual; end if;
    rejected := rejected+1;
  end loop;
  for scenario in select * from (values
    ('suspended Tenant',format('update public.tenants set status=''suspended'' where id=%L',scope)),
    ('suspended actor',format('update public.memberships set status=''suspended'' where id=%L',member)),
    ('revoked role',format('update public.role_assignments set status=''revoked'',revoked_at=now() where membership_id=%L',member))
  ) as cases(label,mutation) loop
    actual := null;
    begin execute scenario.mutation;
      perform public.register_tenant_vehicle(gen_random_uuid()::text,scope,member,actor,null,'qualification','reviewed');
    exception when others then get stacked diagnostics actual=returned_sqlstate; end;
    if actual is distinct from '42501' then raise exception 'Probe % expected 42501, got %',scenario.label,actual; end if;
    rejected := rejected+1;
  end loop;
  if rejected<>28 then raise exception 'Probe count mismatch %',rejected; end if;
  if has_table_privilege('authenticated','public.tenant_vehicles','INSERT') or has_table_privilege('anon','public.vehicle_specifications','SELECT') or
    has_function_privilege('authenticated','public.confirm_tenant_vehicle_source(uuid,uuid,uuid,text,text,text,text)','EXECUTE') then raise exception 'Server-only boundary failed'; end if;
end $$;
select 'PASS: canonical create/read, nullable and curated technical references, explicit inventory/trade-in/consignment mappings, same-Tenant actionable Match, foreign Match unresolved, 28 rejection probes and client denial; all fixtures rolled back' result;
rollback;
