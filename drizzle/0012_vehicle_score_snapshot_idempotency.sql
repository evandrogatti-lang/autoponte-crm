-- Add semantic snapshot idempotency without destroying the audit history.
-- This is intentionally additive and preserves the earlier 0011 schema upgrade.
begin;

alter table public.vehicle_scores
  add column if not exists input_snapshot_hash text;

update public.vehicle_scores
set input_snapshot_hash = encode(digest(coalesce(cast(input_snapshot as text), '{}'), 'sha256'), 'hex')
where input_snapshot_hash is null or input_snapshot_hash = '';

alter table public.vehicle_scores
  alter column input_snapshot_hash set not null,
  alter column input_snapshot_hash set default '';

create unique index if not exists vehicle_scores_semantic_snapshot_unique
  on public.vehicle_scores(vehicle_id, score_type, version, calculator_version, input_snapshot_hash);

commit;
