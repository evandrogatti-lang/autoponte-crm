# AP-CRM-005 — Task Contract

Objective: explicit, authorized Match → persisted Negotiation initiation.
Starting branch: fix/crm-runtime-integration.
Starting HEAD: 4a86e5b0fbf840e3da8b4cf7fe722e45d80847ce (explicit adoption approved).
Starting working tree: clean.

Allowed: minimum nullable canonical TenantVehicle FK, same-Tenant integrity,
transactional service, focused tests/probes, staging migration and minimum fixture,
checkpoint and commit after validation. Preserve manual persistence, Match intelligence,
Tenant/Membership authorization, identity provenance, and all historical business rows.
No workspace UI, automation, Case handoff, inferred identity/vehicle mapping or AP-CRM-006.

Validation: focused domain/auth regressions, both TypeScript configurations,
production build, changed-file ESLint, diff checks, rollback staging gates,
actual concurrent initiation and before/after database evidence.

Impact review: negotiations=0, canonical vehicles=0; 253 legacy Matches and 52 vehicles.
0032 is absent from the live ledger and tenant_vehicle_id is absent. Add one nullable
column/FK/check/index and server-only invoker functions/guards. No backfill or DML in
migration. Existing Match source guard is narrowed to referenced roots; scoring stays
unchanged. Existing RLS/grants and manual creation function remain intact.

Stop conditions: all original AP-CRM-005 decision boundaries remain active. Migration
is explicitly authorized by the task and does not conflict with AGENTS.md governance.
Stop after checkpoint; commit only after scoped validation passes.

Concurrency validation amendment (explicit user approval): accept database lock/
uniqueness evidence because the connector serializes requests. Do not add/require a
DATABASE_URL solely for this test; do not expose, copy or modify credentials.
Verify the live partial unique index and deterministic canonical reuse, record exact
proof in checkpoint. Application-side pre-checks alone are insufficient.

Normative sources used: docs/TENANT_MODEL_V1_PROPOSED.md,
docs/agents/AP-CRM-003-NEGOTIATION-PERSISTENCE-DESIGN.md,
docs/agents/AP-CRM-004-CHECKPOINT.md, docs/agents/AP-CRM-004V-CHECKPOINT.md,
current commercial identity / TenantVehicle / Match implementations.

Original decision boundaries retained: stop if vehicle reference requires broader
schema redesign, canonical source cannot be resolved safely, positive validation needs
historical Match mutation, unrelated API contracts must change, new vehicle/identity
inference is required, or idempotency needs an architectural decision. None applies.
