-- AP-CRM-004 staging probes. Every fixture and mutation is rolled back.
-- Run as the trusted server DB role, after 0028; never against production.
begin;
do $$
declare
  tenant uuid; other_tenant uuid; creator uuid; actor uuid; seller uuid; foreign_member uuid;
  customer text := gen_random_uuid()::text; other_customer text := gen_random_uuid()::text;
  alternate text := gen_random_uuid()::text;
  profile text := gen_random_uuid()::text; unresolved_profile text := gen_random_uuid()::text;
  foreign_profile text := gen_random_uuid()::text;
  lead text := gen_random_uuid()::text; unresolved_lead text := gen_random_uuid()::text;
  foreign_lead text := gen_random_uuid()::text;
  match text := gen_random_uuid()::text; foreign_match text := gen_random_uuid()::text;
  manual_id text := gen_random_uuid()::text; match_negotiation_id text := gen_random_uuid()::text;
  base text; match_base text; scenario record; actual text; passed integer := 0;
begin
  select m.tenant_id,m.id,m.user_id into tenant,creator,actor from public.memberships m
    join public.tenants t on t.id=m.tenant_id and t.status='active'
    join public.role_assignments r on r.membership_id=m.id and r.role_code='owner' and r.status='active'
    where m.status='active' and exists(select 1 from public.memberships s join public.role_assignments sr on sr.membership_id=s.id
      where s.tenant_id=m.tenant_id and s.status='active' and sr.role_code='seller' and sr.status='active') limit 1;
  select m.id into seller from public.memberships m join public.role_assignments r on r.membership_id=m.id
    where m.tenant_id=tenant and m.status='active' and r.role_code='seller' and r.status='active' limit 1;
  select m.tenant_id,m.id into other_tenant,foreign_member from public.memberships m where m.tenant_id<>tenant limit 1;
  if tenant is null or seller is null or other_tenant is null then raise exception 'Probe prerequisites missing'; end if;
  insert into public.customers(id,tenant_id,name) values(customer,tenant,'AP004 rollback customer'),(alternate,tenant,'AP004 alternate'),(other_customer,other_tenant,'AP004 foreign');
  -- Clone complete existing roots to avoid inventing unrelated fixture contracts.
  insert into public.buyer_profiles select (jsonb_populate_record(null::public.buyer_profiles,to_jsonb(b)||jsonb_build_object('id',profile,'tenant_id',tenant,'customer_id',null))).* from public.buyer_profiles b where b.tenant_id=tenant limit 1;
  insert into public.buyer_profiles select (jsonb_populate_record(null::public.buyer_profiles,to_jsonb(b)||jsonb_build_object('id',unresolved_profile,'customer_id',null))).* from public.buyer_profiles b where b.id=profile;
  insert into public.buyer_profiles select (jsonb_populate_record(null::public.buyer_profiles,to_jsonb(b)||jsonb_build_object('id',foreign_profile,'tenant_id',other_tenant,'customer_id',null))).* from public.buyer_profiles b where b.id=profile;
  insert into public.trade_ins select (jsonb_populate_record(null::public.trade_ins,to_jsonb(l)||jsonb_build_object('id',lead,'tenant_id',tenant))).* from public.trade_ins l where l.tenant_id=tenant limit 1;
  insert into public.trade_ins select (jsonb_populate_record(null::public.trade_ins,to_jsonb(l)||jsonb_build_object('id',unresolved_lead))).* from public.trade_ins l where l.id=lead;
  insert into public.trade_ins select (jsonb_populate_record(null::public.trade_ins,to_jsonb(l)||jsonb_build_object('id',foreign_lead,'tenant_id',other_tenant))).* from public.trade_ins l where l.id=lead;
  perform public.confirm_commercial_identity('buyer_profile',profile,customer,null,tenant,creator,actor,'AP004 rollback confirmation','probe');
  perform public.confirm_commercial_identity('lead',lead,customer,null,tenant,creator,actor,'AP004 rollback confirmation','probe');
  insert into public.vehicle_matches(id,buyer_profile_id,source_type,source_id,vehicle_label,score) values(match,profile,'trade_in',lead,'AP004 structural probe',0),(foreign_match,foreign_profile,'trade_in',foreign_lead,'AP004 foreign probe',0);
  perform public.create_manual_negotiation(manual_id,tenant,creator,actor,seller,customer,lead,profile,'manual');
  if not exists(select 1 from public.negotiations where id=manual_id and tenant_id=tenant and customer_id=customer
    and created_by_membership_id=creator and responsible_membership_id=seller and match_id is null and stage='contact' and lifecycle='active') then
    raise exception 'Valid creation/read failed'; end if;
  if not exists(select 1 from public.negotiations n
    join public.identity_link_events p on p.id=n.buyer_profile_identity_event_id and p.tenant_id=n.tenant_id and p.buyer_profile_id=n.buyer_profile_id and p.customer_id=n.customer_id
    join public.identity_link_events l on l.id=n.lead_identity_event_id and l.tenant_id=n.tenant_id and l.lead_id=n.lead_id and l.customer_id=n.customer_id
    where n.id=manual_id) then raise exception 'Observed identity confirmation provenance missing'; end if;
  -- Repeat manual Customer/identity is valid; no global Customer uniqueness.
  perform public.create_manual_negotiation(gen_random_uuid()::text,tenant,creator,actor,seller,customer,null,null,'phone');
  perform public.create_manual_negotiation(gen_random_uuid()::text,tenant,creator,actor,seller,customer,null,null,'manual');
  base := format('insert into public.negotiations(id,tenant_id,customer_id,responsible_membership_id,created_by_membership_id,origin) values(%L,%L,%L,%L,%L,''manual'')',gen_random_uuid()::text,tenant,customer,seller,creator);
  -- Direct SQL probes prove constraints, including checks independently of the service.
  for scenario in select * from (values
    ('required Tenant',replace(base,quote_literal(tenant), 'null'),'23503'),
    ('required Customer',replace(base,quote_literal(customer), 'null'),'23503'),
    ('required responsible',replace(base,quote_literal(seller), 'null'),'23502'),
    ('required creator',replace(base,quote_literal(creator), 'null'),'23502'),
    ('foreign Customer',replace(base,quote_literal(customer),quote_literal(other_customer)),'23503'),
    ('foreign responsible',replace(base,quote_literal(seller),quote_literal(foreign_member)),'23503'),
    ('foreign creator',replace(base,quote_literal(creator),quote_literal(foreign_member)),'23503'),
    ('unresolved Lead',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,%L,null,''manual'')',gen_random_uuid()::text,tenant,creator,actor,seller,customer,unresolved_lead),'23514'),
    ('unresolved Profile',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,%L,''manual'')',gen_random_uuid()::text,tenant,creator,actor,seller,customer,unresolved_profile),'23514'),
    ('conflicting Lead',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,%L,null,''manual'')',gen_random_uuid()::text,tenant,creator,actor,seller,alternate,lead),'23514'),
    ('conflicting Profile',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,%L,''manual'')',gen_random_uuid()::text,tenant,creator,actor,seller,alternate,profile),'23514'),
    ('foreign Lead',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,%L,null,''manual'')',gen_random_uuid()::text,tenant,creator,actor,seller,customer,foreign_lead),'23503'),
    ('foreign Profile',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,%L,''manual'')',gen_random_uuid()::text,tenant,creator,actor,seller,customer,foreign_profile),'23503'),
    ('foreign creator command',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,null,''manual'')',gen_random_uuid()::text,tenant,foreign_member,actor,seller,customer),'42501'),
    ('foreign seller command',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,null,''manual'')',gen_random_uuid()::text,tenant,creator,actor,foreign_member,customer),'42501'),
    ('wrong authenticated user',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,null,''manual'')',gen_random_uuid()::text,tenant,creator,gen_random_uuid(),seller,customer),'42501'),
    ('missing seller RoleAssignment',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,null,''manual'')',gen_random_uuid()::text,tenant,creator,actor,creator,customer),'42501'),
    ('Match initiation gate',format('select public.create_manual_negotiation(%L,%L,%L,%L,%L,%L,null,null,''match_manual'')',gen_random_uuid()::text,tenant,creator,actor,seller,customer),'23514'),
    ('Match origin missing Match',replace(base,'''manual''','''match_manual'''),'23514'),
    ('unknown origin',replace(base,'''manual''','''unknown'''),'23514'),
    ('invalid stage',format('update public.negotiations set stage=''closed'' where id=%L',manual_id),'23514'),
    ('invalid lifecycle',format('update public.negotiations set lifecycle=''lost'' where id=%L',manual_id),'23514'),
    ('closure on active',format('update public.negotiations set closure_reason=''lost'' where id=%L',manual_id),'23514'),
    ('closed missing metadata',format('update public.negotiations set lifecycle=''closed'' where id=%L',manual_id),'23514'),
    ('formalized missing timestamp',format('update public.negotiations set lifecycle=''formalized'' where id=%L',manual_id),'23514'),
    ('immutable creation Customer',format('update public.negotiations set customer_id=%L where id=%L',alternate,manual_id),'23514')
    ,('immutable confirmation provenance',format('update public.negotiations set lead_identity_event_id=null where id=%L',manual_id),'23514')
  ) as cases(label,statement,expected) loop
    actual := null;
    begin execute scenario.statement;
    exception when others then get stacked diagnostics actual=returned_sqlstate;
    end;
    if actual is distinct from scenario.expected then raise exception 'Probe % expected %, got %',scenario.label,scenario.expected,actual; end if;
    passed := passed+1;
  end loop;
  -- Prepared Match persistence is structural only, never an actionable production command.
  match_base := format('insert into public.negotiations(id,tenant_id,customer_id,buyer_profile_id,match_id,responsible_membership_id,created_by_membership_id,origin) values(%L,%L,%L,%L,%L,%L,%L,''match_manual'')',match_negotiation_id,tenant,customer,profile,match,seller,creator);
  execute match_base;
  for scenario in select * from (values
    ('duplicate active Match',replace(match_base,quote_literal(match_negotiation_id),quote_literal(gen_random_uuid()::text)),'23505'),
    ('missing Match FK',replace(replace(match_base,quote_literal(match_negotiation_id),quote_literal(gen_random_uuid()::text)),quote_literal(match),'''nonexistent-match'''),'23503'),
    ('foreign Match profile authority',replace(replace(match_base,quote_literal(match_negotiation_id),quote_literal(gen_random_uuid()::text)),quote_literal(match),quote_literal(foreign_match)),'23514'),
    ('Match lacks Profile',replace(replace(match_base,quote_literal(match_negotiation_id),quote_literal(gen_random_uuid()::text)),quote_literal(profile),'null'),'23514'),
    ('Match reassigned Profile',format('update public.vehicle_matches set buyer_profile_id=%L where id=%L',unresolved_profile,match),'23514')
  ) as cases(label,statement,expected) loop
    actual := null;
    begin execute scenario.statement;
    exception when others then get stacked diagnostics actual=returned_sqlstate;
    end;
    if actual is distinct from scenario.expected then raise exception 'Probe % expected %, got %',scenario.label,scenario.expected,actual; end if;
    passed := passed+1;
  end loop;
  update public.negotiations set lifecycle='formalized',formalized_at=now(),stage='ready_for_formalization' where id=match_negotiation_id;
  actual := null;
  begin execute replace(match_base,quote_literal(match_negotiation_id),quote_literal(gen_random_uuid()::text));
  exception when others then get stacked diagnostics actual=returned_sqlstate; end;
  if actual is distinct from '23505' then raise exception 'Formalized Match must retain uniqueness'; end if;
  -- Closed history releases the active key; lifecycle transitions are only constraint probes.
  update public.negotiations set lifecycle='closed',closed_at=now(),closure_reason=null where id=match_negotiation_id;
  if not exists(select 1 from public.negotiations where id=match_negotiation_id and formalized_at is not null and closure_reason is null) then
    raise exception 'Post-Case closure must preserve formalization without a competing loss reason'; end if;
  actual := null;
  begin update public.negotiations set closure_reason='lost' where id=match_negotiation_id;
  exception when others then get stacked diagnostics actual=returned_sqlstate; end;
  if actual is distinct from '23514' then raise exception 'Post-Case loss reason must be rejected'; end if;
  passed := passed+1;
  update public.negotiations set lifecycle='closed',closed_at=now(),closure_reason='lost' where id=manual_id;
  execute replace(match_base,quote_literal(match_negotiation_id),quote_literal(gen_random_uuid()::text));
  perform public.confirm_commercial_identity('buyer_profile',profile,alternate,customer,tenant,creator,actor,'AP004 correction history','probe');
  perform public.confirm_commercial_identity('lead',lead,alternate,customer,tenant,creator,actor,'AP004 correction history','probe');
  if not exists(select 1 from public.negotiations where id=manual_id and customer_id=customer) or
    (select count(*) from public.identity_link_events where tenant_id=tenant and previous_customer_id=customer and customer_id=alternate and (buyer_profile_id=profile or lead_id=lead)) <> 2 then
    raise exception 'Correction history / persisted identity preservation failed'; end if;
  -- State updates remain possible after corrections; no silent Customer rebinding.
  update public.negotiations set stage='qualification' where id=manual_id;
  -- Revalidate authority inside creation, even if server Tenant resolution preceded revocation.
  for scenario in select * from (values
    ('inactive Tenant',format('update public.tenants set status=''suspended'' where id=%L',tenant)),
    ('inactive creator',format('update public.memberships set status=''suspended'' where id=%L',creator)),
    ('inactive seller',format('update public.memberships set status=''suspended'' where id=%L',seller)),
    ('revoked creator role',format('update public.role_assignments set status=''revoked'',revoked_at=now() where membership_id=%L',creator)),
    ('revoked seller role',format('update public.role_assignments set status=''revoked'',revoked_at=now() where membership_id=%L',seller))
  ) as cases(label,mutation) loop
    actual := null;
    begin
      execute scenario.mutation;
      perform public.create_manual_negotiation(gen_random_uuid()::text,tenant,creator,actor,seller,customer,null,null,'manual');
    exception when others then get stacked diagnostics actual=returned_sqlstate;
    end; -- Expected failure also rolls back the simulated revocation.
    if actual is distinct from '42501' then raise exception 'Probe % expected 42501, got %',scenario.label,actual; end if;
    passed := passed+1;
  end loop;
  if has_table_privilege('anon','public.negotiations','SELECT') or has_table_privilege('authenticated','public.negotiations','INSERT') or
    has_function_privilege('authenticated','public.create_manual_negotiation(text,uuid,uuid,uuid,uuid,text,text,text,text)','EXECUTE') then
    raise exception 'Server-only boundary failed'; end if;
  if passed<>38 then raise exception 'Unexpected rejection probe count: %',passed; end if;
end $$;
select 'PASS: valid creation/read, manual repeat, 39 rejection probes, Match history, pre/post-Case closure, correction history/provenance, revocation, server-only grants; all fixtures rolled back' as result;
rollback;
