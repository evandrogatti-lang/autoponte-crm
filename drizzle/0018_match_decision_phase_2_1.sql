alter table public.customer_intents
  add column if not exists soft_constraints jsonb not null default '[]'::jsonb,
  add column if not exists requirement_classification jsonb not null default '{}'::jsonb,
  add column if not exists clarification_prompts jsonb not null default '[]'::jsonb;

alter table public.vehicle_matches
  add column if not exists constraint_type jsonb not null default '{}'::jsonb,
  add column if not exists hard_constraint_pass boolean,
  add column if not exists hard_constraint_failures jsonb not null default '[]'::jsonb,
  add column if not exists soft_deviations jsonb not null default '[]'::jsonb,
  add column if not exists preferences_satisfied jsonb not null default '[]'::jsonb,
  add column if not exists commercial_advantages jsonb not null default '[]'::jsonb,
  add column if not exists compensation_reasons jsonb not null default '[]'::jsonb,
  add column if not exists match_fit_score integer,
  add column if not exists opportunity_score integer,
  add column if not exists opportunity_override boolean not null default false,
  add column if not exists ranking_position integer,
  add column if not exists evaluation_run_id text,
  add column if not exists scoring_version text,
  add column if not exists evaluated_at timestamptz;

create index if not exists vehicle_matches_evaluation_ranking_idx
  on public.vehicle_matches(evaluation_run_id, hard_constraint_pass desc, ranking_position);

comment on column public.vehicle_matches.score is 'Legacy Match Fit score; Phase 2.1 does not change its weights.';
comment on column public.vehicle_matches.opportunity_score is 'Separate commercial-opportunity evidence score; never overrides HARD eligibility.';
