# AP-CRM-004V2B1 — authenticated synthetic homologation executor

Date: 2026-10-02 Europe/Berlin.
Status: READY_FOR_SYNTHETIC_BATCH_EXECUTION. The real batch has NOT been executed.
Implementation base: `de155b3c5fc60ec569f24e400b3759ad14d92fe5`, branch `fix/crm-runtime-integration`.
The two unrelated uncommitted OpportunityWorkspace files were not edited or staged by this slice.

## Phase 1 evidence

The user explicitly confirmed real Preview Phase 1 PASS before authorizing Phase 2.
Preview: https://autoponte-jftmlms7p-auto-ponte.vercel.app
Deployment: `dpl_7NiSXEBHhWNU8cxim9jxV3FS5bXU`.
Vercel deployment inspection confirmed READY, approved project
`prj_5jiXHFrJuH7jfRp5WlANvmRpoIdU`, and branch `fix/crm-runtime-integration`.
The user supplied authenticated endpoint evidence: environment preview; Auth project
`prcmlynykncfgzwluoef`; persistence host `aws-1-eu-west-3.pooler.supabase.com`, database
`postgres`, project `prcmlynykncfgzwluoef`; identitiesAgree true; batchExecuted false.
This authenticated response was confirmed by the user, not independently captured by
the agent (Chrome blocked direct endpoint navigation). Phase 2 does not reopen this approved result.

## Restricted environment guard

Requires VERCEL=1, Preview, the fixed approved project ID, approved Git branch,
deployment ID, and runtime region. A supplied conflicting target environment is denied.
Auth must use the exact HTTPS teste2 project URL. Persistence must use PostgreSQL,
the documented Session Pooler host, port 5432, project-qualified database username,
and database postgres. Ambiguous connection options, alternate destinations, or missing
metadata fail closed. No local runtime bypass, client environment override, or credential substitution.
URL/parser/auth/DB exceptions are not exposed in HTTP responses or logged by the executor.

## Authentication and authorization

One internal POST: `/api/internal/homologation/first-synthetic-batch`.
No navigation or Workspace changes. Same-origin requests only; query parameters and
invalid/oversized JSON are denied. The only accepted payload is an empty object (or empty body).

Execution: verified application User -> environment guard -> existing resolveTenantContext
for the server-fixed Tenant -> owner/manager role -> reject all client identity/manifest
parameters -> one database transaction. The resolved User must equal the authenticated User.
Inactive Membership/Tenant/Role checks remain in the existing Tenant runtime, with a
second authorization check under database locks through assert_vehicle_registry_actor.

## Exact manifest

Tenant: `03824f9e-0924-435e-8b20-50b8ea52774b`.

| Inventory source | Trade-in alias |
| --- | --- |
| phase2-p2-01-vehicle | none |
| phase2-p2-02-vehicle | none |
| pilot-p1-01-vehicle | none |
| phase2-p2-03-vehicle | phase2-p2-03-opportunity |
| pilot-p1-02-vehicle | pilot-p1-02-opportunity |

Exactly five roots, seven links; each approved pair shares one root.
All qualification, specification NULL; fictitious homologation identity only.
No inference, availability promotion, Customer confirmation, Match mutation, or Negotiation creation.

## Transaction and re-execution

One existing Drizzle transaction composes register_tenant_vehicle and
confirm_tenant_vehicle_source; no schema changes or duplicate registration business rules.
A transaction-scoped advisory lock serializes this exact batch. Existing source unique
indexes are the database backstop. Exact source records and aliases are locked and
revalidated, including trade-in Tenant. Sources outside the manifest are never registered.

Existing roots carrying the batch marker and all relevant mappings are inspected before writes.
Only a complete five-root/seven-link batch with exact ownership, aliases, status,
specification and provenance is returned as ALREADY_EXECUTED. Orphan roots, partial
links, foreign mappings, conflicting aliases and changed provenance fail closed.
Final persisted state is checked before commit; any operation or validation failure
aborts all registrations and source confirmations together.

Provenance records AP-CRM-004V2A, AP-CRM-004V2, first_synthetic_batch_5,
synthetic_homologation, teste2, approved Tenant, explicit_approved_manifest,
realPhysicalVehicleVerified=false, exact source/alias, actual User/Membership,
timestamp and reason. No secrets, inferred specifications or verified physical identity.

## Validation and limits

64 focused tests PASS: environment/endpoint/executor, existing Tenant runtime, and
TenantVehicle regression tests. Covers unauthenticated, seller, inactive Membership,
wrong Tenant/actor/environment/branch/project/Auth/DB; all client overrides; CSRF;
source/alias inconsistency; failure at each of twelve writes; replay; partial/corrupt state.
Real Drizzle PostgreSQL rendering verifies source arrays are bound as PostgreSQL arrays.
Typecheck, changed-file ESLint, production build and git diff --check PASS.

Rollback/replay tests use an in-memory transactional database adapter executing the
actual executor control flow. They are not live PostgreSQL batch probes or a new live
concurrency measurement. Production transaction/lock/uniqueness behavior uses existing
PostgreSQL and AP-CRM-004V primitives; no real synthetic batch was used for negative tests.
No business database connection or write was performed by these Phase 2 tests.
The integrated executor has not been redeployed or invoked in the real Preview during Phase 2.

The read-only environment endpoint remains for deployment validation.
The executor is temporary: removal should be a separate cleanup slice after the approved
batch is executed and its database evidence is reviewed. No automatic Production promotion.
Next action requires a separate instruction to execute the actual batch; this checkpoint
does not claim TenantVehicle UUIDs, mappings, Match resolution counts, or batch completion.
