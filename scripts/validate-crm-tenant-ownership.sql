-- AP-CRM-003D1D rollback-only staging probes. No persistent test changes.
begin;
do $$ declare target uuid := '03824f9e-0924-435e-8b20-50b8ea52774b'; other uuid := '54fb9ae6-9b5e-4e82-8fc2-b01848a288d9'; rejected boolean; ctx record;
begin
-- Existing same-Tenant Case references remain valid.
if exists(select 1 from commercial_cases c left join customers u on u.id=c.customer_id left join trade_ins l on l.id=c.opportunity_id where (c.customer_id is not null and u.tenant_id is distinct from c.tenant_id) or (c.opportunity_id is not null and l.tenant_id is distinct from c.tenant_id)) then raise exception 'Case coherence failed'; end if;
insert into customers(id,name,tenant_id) values ('ap-crm-003d1d-probe-customer','Rollback probe',other);
rejected := false;
begin update commercial_cases set customer_id='ap-crm-003d1d-probe-customer' where id='pilot-p1-01'; exception when foreign_key_violation then rejected := true; end;
if not rejected then raise exception 'Cross-Tenant Customer accepted'; end if;
-- Same family and business fields; change tenant only inside rollback transaction.
insert into trade_ins select (jsonb_populate_record(null::trade_ins,to_jsonb(t)||jsonb_build_object('id','ap-crm-003d1d-probe-lead','tenant_id',other))).* from trade_ins t where id='pilot-p1-01-opportunity';
rejected := false;
begin update commercial_cases set opportunity_id='ap-crm-003d1d-probe-lead' where id='pilot-p1-01'; exception when foreign_key_violation then rejected := true; end;
if not rejected then raise exception 'Cross-Tenant Lead accepted'; end if;
rejected := false;
begin update buyer_profiles set tenant_id=null where id='pilot-p1-01-buyer'; exception when not_null_violation then rejected := true; end;
if not rejected then raise exception 'Tenantless BuyerProfile accepted'; end if;
-- Public route: locked lookup and Tenant resolved from persistence, not request.
select r.tenant_id,r.store_id into strict ctx from intake_routes r join tenants t on t.id=r.tenant_id where r.route_key='public_buyer_profile' and r.intake_kind='buyer_profile' and r.status='active' and t.status='active' and r.store_id is null for share of r,t;
if ctx.tenant_id <> target then raise exception 'Wrong intake Tenant'; end if;
insert into buyer_profiles select (jsonb_populate_record(null::buyer_profiles,to_jsonb(b)||jsonb_build_object('id','ap-crm-003d1d-probe-buyer','tenant_id',ctx.tenant_id))).* from buyer_profiles b where id='pilot-p1-01-buyer';
update intake_routes set status='inactive' where route_key='public_buyer_profile';
if exists(select 1 from intake_routes r join tenants t on t.id=r.tenant_id where r.route_key='public_buyer_profile' and r.status='active' and t.status='active') then raise exception 'Inactive route accepted'; end if;
end $$;
rollback;
select 'PASS: same-tenant, cross-tenant rejection, NOT NULL, persisted route and rollback probes' as result;
