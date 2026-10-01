# AP-CRM-003D1D — Tenant ownership checkpoint

## Scope and authorization

Branch: `fix/crm-runtime-integration`; starting HEAD: `ae471c3c189522abb2d2c4a6747c8b78bf94ea4c`.
Database: `teste2`, project `prcmlynykncfgzwluoef`. No Production access or configuration changes.

The user's AP-CRM-003D1C policy explicitly assigns the 204 enumerated legacy test records to `03824f9e-0924-435e-8b20-50b8ea52774b`. This is policy ownership, not reconstructed historical provenance. The follow-up public-routing decision authorizes the two current staging endpoints to use persisted active routing to that same Tenant, with no Store.

## Repository reconciliation

Restored `drizzle/0023_tenant_core_fail_closed.sql` from `35a4cb5ae87e52a77a4ef5a6c72263563aadb949` and `drizzle/0024_tenant_core_read_policies.sql` from `77eadcdb7fc48837c8293da533ed0f588b578e60`, together with their historical deployment checkpoints. Added Drizzle Tenant Core definitions matching the live columns, status/revocation checks, FKs, uniqueness, indexes and enabled RLS. Historical SQL remains authoritative for policies and grants. Auth users remain provider-owned.

Neither historical migration was replayed. The existing Supabase ledger entry `20260918130326` was preserved. The new migration is recorded as `20261001190348`, `crm_tenant_ownership_teste2`; its repository source is `drizzle/0025_crm_tenant_ownership_teste2.sql`. Drizzle's existing incomplete journal was not used to claim these administrative deployments. Do not run `db:push` or replay restored migrations against staging.

The Supabase CLI created a local migration stub; the SQL was retained in the repository's existing `drizzle` convention and the empty stub was removed. No dependency or lockfile changes were made.

## Recovery evidence and execution

`AP-CRM-003D1D-BEFORE-STATE.json` contains every exact live ID, previous ownership (null; columns did not yet exist), target ownership, operation/time and original business-row hash. It contains no contact values or secrets.

The new migration ran in one transaction with locks, exact-ID/count/hash checks and fixture-family validation. It added nullable UUID Tenant FKs with no default, updated only the approved manifest, validated unchanged business hashes, introduced Case same-tenant FKs, then finalized NOT NULL. A failure before commit would roll back the entire migration. No historical data or Tenant Core rows were deleted or rewritten.

All four roots now have 51/51 rows owned by the homologation Tenant, zero null ownership, zero reserved-Tenant ownership and 51 unchanged business hashes each. There were no non-manifest rows. Case Customer and Lead references remain valid. `phase2-p2-36-case` notes were preserved.

## Runtime behavior

`lib/tenant-runtime.ts` queries canonical Membership using the authenticated Supabase User ID. It requires an active Tenant, active/non-revoked Membership and active/non-revoked approved role. A requested Tenant is only a selector among authorized memberships; absence or ambiguity fails closed. Owner has access to active Stores of its Tenant; manager/seller need active StoreAccess. The existing manual Lead creation path uses this resolver so NOT NULL does not leave it tenantless.

The two public endpoints select fixed server-owned route keys from `intake_routes`, lock the route and Tenant during inserts, and reject missing/inactive/wrong-kind routing or unapproved Store context. Request tenant/store fields are not used. Both staging configurations have `store_id = null`; no Production routing was created.

Intake-triggered matching scopes BuyerProfiles/Leads to the resolved Tenant. Tenantless consignments are excluded from this new scoped candidate path until their ownership is normalized. Match scoring and existing unscoped legacy callers remain unchanged. This is not a general CRM authorization or RLS rollout; existing quarantine policies remain intact.

## Validation

- Full typecheck: `node node_modules/typescript/bin/tsc --noEmit --incremental false` — PASS.
- Scoped typecheck: `node node_modules/typescript/bin/tsc -p tsconfig.validation.json --allowImportingTsExtensions` — PASS. The flag handles pre-existing `.ts` imports.
- Focused tests covering Tenant policy/runtime/intake, authentication, Match and Cases — 98 PASS.
- Build: `npm run build` — PASS with network access for existing Google Fonts. The initial sandboxed attempt failed only on font downloads.
- Changed-file ESLint — zero errors; one pre-existing unused `sql` import warning in `db/schema.ts`.
- Repository-wide ESLint — FAIL: 57 pre-existing errors and 24 warnings in unrelated files/backup directories. No error file belongs to this slice.
- `git diff --check` — PASS.
- `scripts/validate-crm-tenant-ownership.sql` executed against staging — PASS. It checks Case coherence, cross-tenant Customer/Lead rejection, tenantless BuyerProfile rejection, persisted public routing and inactive-route failure, all with rollback.
- Post-probe staging checks — four counts remain 51, both routes remain active with null Store, zero Case tenant mismatches, zero probe rows.

No HTTP Preview deployment was made or claimed. Endpoint/resolver code was exercised through focused tests; database behavior was verified directly in staging. An old deployed Preview still runs old application code until this checkpoint is deployed, and its public/manual inserts cannot satisfy the new NOT NULL constraint. Coordinate Preview rollout before intake use; do not work around this with a default Tenant.

## Checkpoint status

Database backfill and repository implementation are complete. The approved checkpoint uses scoped lint validation: zero changed-file errors. All required checks were reconfirmed before commit. Repository-wide lint debt is recorded separately in AP-CRM-003D1D-LINT-DEBT.md. The existing untracked Negotiation design is excluded. Preview deployment and runtime validation are the mandatory next gate; AP-CRM-003D remains on hold.
