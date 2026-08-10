-- AutoPonte CRM · Vehicle Demand FIPE Layer V1
-- Transitional structured demand fields. Existing desired_vehicle remains as the human-readable label.

alter table public.trade_ins add column if not exists desired_brand_code text not null default '';
alter table public.trade_ins add column if not exists desired_brand text not null default '';
alter table public.trade_ins add column if not exists desired_model_key text not null default '';
alter table public.trade_ins add column if not exists desired_model text not null default '';
alter table public.trade_ins add column if not exists desired_version_code text not null default '';
alter table public.trade_ins add column if not exists desired_version text not null default '';
alter table public.trade_ins add column if not exists desired_year_min integer not null default 0;
alter table public.trade_ins add column if not exists desired_year_max integer not null default 0;
alter table public.trade_ins add column if not exists desired_price_min integer not null default 0;
alter table public.trade_ins add column if not exists desired_price_max integer not null default 0;
alter table public.trade_ins add column if not exists desired_search_scope text not null default 'legacy';

create index if not exists trade_ins_desired_brand_model_idx
  on public.trade_ins(desired_brand_code, desired_model_key);

create index if not exists trade_ins_desired_year_price_idx
  on public.trade_ins(desired_year_min, desired_year_max, desired_price_max);

alter table public.trade_ins drop constraint if exists trade_ins_desired_search_scope_check;
alter table public.trade_ins add constraint trade_ins_desired_search_scope_check
  check (desired_search_scope in ('legacy', 'brand', 'model', 'version'));

comment on column public.trade_ins.desired_search_scope is
  'Transitional demand scope. Will migrate to customer_demands in Operational Foundation V2.';
