-- AP-CRM-004: preserve the AP-CRM-003 post-Case closure contract.
-- 0028 has already been recorded in staging; retain that migration unchanged.
-- Negotiation remains empty. No business rows or Case workflow are changed.
alter table public.negotiations drop constraint negotiations_lifecycle_metadata_check;
alter table public.negotiations add constraint negotiations_lifecycle_metadata_check check(
  (lifecycle='active' and closed_at is null and closure_reason is null and formalized_at is null) or
  (lifecycle='formalized' and formalized_at is not null and closed_at is null and closure_reason is null) or
  (lifecycle='closed' and closed_at is not null and
    ((formalized_at is null and closure_reason is not null) or (formalized_at is not null and closure_reason is null))));
