-- AutoPonte CRM · Sprint Operational Layer V1
-- Execute uma vez no SQL Editor do Supabase antes do deploy desta versão.

create extension if not exists pgcrypto;

alter table public.trade_ins add column if not exists next_action text not null default '';
alter table public.trade_ins add column if not exists probability integer not null default 0;
alter table public.trade_ins add column if not exists confidence_score integer not null default 0;
alter table public.trade_ins add column if not exists temperature_score integer not null default 0;
alter table public.trade_ins add column if not exists momentum text not null default 'stable';
alter table public.trade_ins add column if not exists priority_score integer not null default 0;
alter table public.trade_ins add column if not exists recommendation_action text not null default '';
alter table public.trade_ins add column if not exists recommendation_channel text not null default '';
alter table public.trade_ins add column if not exists recommendation_urgency text not null default '';
alter table public.trade_ins add column if not exists recommendation_rationale text not null default '';
alter table public.trade_ins add column if not exists updated_at timestamptz not null default now();

create table if not exists public.opportunity_events (
  id text primary key,
  opportunity_id text not null references public.trade_ins(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text not null default '',
  metadata text not null default '{}',
  actor_name text not null default 'Sistema AutoPonte',
  actor_email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists opportunity_events_opportunity_created_idx
  on public.opportunity_events(opportunity_id, created_at desc);

-- Cria o marco inicial do histórico para oportunidades existentes sem inventar ações comerciais.
insert into public.opportunity_events (
  id, opportunity_id, event_type, title, description, metadata, actor_name, actor_email, created_at
)
select
  gen_random_uuid()::text,
  t.id,
  'imported',
  'Oportunidade incorporada ao Workspace',
  'Registro real existente antes da ativação da Operational Layer V1.',
  '{"source":"operational_layer_v1_migration"}',
  'Sistema AutoPonte',
  '',
  t.created_at
from public.trade_ins t
where not exists (
  select 1 from public.opportunity_events e where e.opportunity_id = t.id
);
