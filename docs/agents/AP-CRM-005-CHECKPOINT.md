# AP-CRM-005 — RESULT / CHECKPOINT

Status: COMPLETE — READY_FOR_AP-CRM-006.
Date: 2026-10-02. Environment: staging teste2 only (`prcmlynykncfgzwluoef`).
AP-CRM-006 has not been started.

## 1. Repository state

Branch: `fix/crm-runtime-integration`.
Approved starting HEAD: `4a86e5b0fbf840e3da8b4cf7fe722e45d80847ce`.
Starting status: clean. Governance commit retained and rules followed.
Task explicitly authorizes the minimum schema migration, staging fixture and commit.
No conflict with the new execution rules; no destructive Git operations.

## 2. Start Negotiation service

`lib/negotiation/service.ts::startNegotiationFromMatch` accepts
`{matchId, responsibleMembershipId, leadId?, tenantId?}` and returns
`{negotiationId, created}`. Tenant is an authenticated selector, never trusted authority.
Customer, BuyerProfile, vehicle, creator, origin and lifecycle cannot be supplied by callers.

The server resolves Tenant/Membership/User, then runs a READ COMMITTED transaction.
The server-only SQL command rechecks and locks active authority, locks the exact Match,
validates its Profile/Customer and optional buyer Lead, resolves the explicit vehicle,
returns a safe existing Negotiation or inserts `match_manual/contact/active`.
Confirmed identity events are captured by the existing provenance trigger.

## 3. Negotiation vehicle reference

`db/negotiation-schema.ts`: nullable `tenantVehicleId` / `tenant_vehicle_id`.
Live FK: `FOREIGN KEY (tenant_id, tenant_vehicle_id) REFERENCES
 tenant_vehicles(tenant_id, id) ON DELETE RESTRICT`.
Check: `match_id IS NULL OR tenant_vehicle_id IS NOT NULL`.
Covering index: `negotiations_vehicle_idx(tenant_id,tenant_vehicle_id)`.
Vehicle creation reference is immutable, matching other creation provenance.
Manual creation still persists without vehicle; no FK to legacy `vehicles`.

## 4. Customer resolution

Match → exact persisted BuyerProfile → confirmed Customer in validated Tenant.
Null identity blocks as `UNRESOLVED_CUSTOMER`; optional Lead must be confirmed and agree,
otherwise `UNRESOLVED_CUSTOMER` / `CONFLICT_CUSTOMER`.
Cross-Tenant roots fail closed. No implicit Customer creation or contact-based mapping.
Existing Negotiation identity/event references remain historical after corrections.
Retries after incompatible identity changes fail deterministically, without rebinding.

## 5. TenantVehicle resolution

`public.resolve_match_vehicle` shares AP004V resolution with the existing TS read service.
Only immutable typed source links (inventory/trade_in/consignment), matching validated
Tenant, resolve a canonical vehicle. Contradictory inventory references and unsupported
sources remain unresolved. `available` is required to initiate; specification may be NULL.
No inferred identity, registration, mapping, backfill or technical specification creation.
Referenced Match source/Profile cannot be retargeted; score/reasons remain Match-owned.

## 6. Membership authorization

Active Tenant, active unrevoked creator Membership bound to authenticated User, active
unrevoked owner/manager/seller RoleAssignment; responsible Membership must be active,
unrevoked, same-Tenant with an active seller RoleAssignment. Locks persist to commit.
No authorization based on crm_users.store_id, seller-profile ID or client actor fields.
Tenant runtime / StoreAccess behavior remains intact; no universal Store requirement.

## 7. Idempotency and exact database concurrency evidence

The user explicitly approved database lock/uniqueness evidence instead of overlapping
connector transactions, and instructed not to require/add a direct DATABASE_URL solely
for this test. No credentials were exposed, copied or modified. Connector dispatches
were serialized: the attempted 30-second hold began at 11:22:19.724444 UTC; the other
backend began at 11:22:56.897726 UTC. This is NOT an overlapping concurrency test.

Direct teste2 catalog verification:

```sql
CREATE UNIQUE INDEX negotiations_active_match_key
ON public.negotiations USING btree (tenant_id, match_id)
WHERE ((match_id IS NOT NULL)
  AND (lifecycle = ANY (ARRAY['active'::text, 'formalized'::text])));
```

`indisunique=true`, `indisvalid=true`, `indisready=true`.
The live command definition has `FOR UPDATE OF m` BEFORE testing Negotiation existence.
Function is volatile (`provolatile='v'`), security invoker (`prosecdef=false`), search_path=''.
Staging transaction/default isolation is READ COMMITTED; the TS command sets it explicitly.
Invocation holds granted `RowShareLock` on vehicle_matches (catalog-observed table lock;
row exclusivity is established by the live `FOR UPDATE OF m` statement).

Concurrent equivalent commands serialize on the same Match row, then fresh SQL reads
reuse the committed canonical root. This is a DB lock, not an application pre-check.
The partial unique index independently prohibits duplicate active/formalized roots.
The rollback duplicate INSERT failed with SQLSTATE `23505` and diagnostics
`constraint_name='negotiations_active_match_key'`; formalized uniqueness also passed.
Equivalent active/formalized retries return existing ID with `created=false`.
Changed Lead/assignee/identity/vehicle, automated origin, or closed history fail safely;
`NEGOTIATION_CONFLICT` requires a future explicit correction/reactivation command.
No automatic reopening or replacement is implemented.

Committed positive result: `3487214d-e395-4573-bf43-c127bd9fea10`, first `created=true`,
repeats `created=false`; live Tenant+Match active/formalized count is exactly 1.

## 8. Legacy Matches

253 original Matches remain byte-equivalent by ordered whole-row JSON hash:
`md5(string_agg(row_to_json(m)::text,'' order by id)) = a04efaeae7379b71ff28c88afd4b44a9`
before and after, excluding only the new synthetic fixture Match.
All 253 were run through the shared vehicle resolver: resolved vehicles = 0.
Historical Match rows modified = 0; inferred mappings = 0; permanent backfill = 0.
52 legacy vehicles retained; whole-row hash unchanged: `f3891552a26ddb6a95d64c8c1b86b37c`.
No Match scoring/reasons/state/outcome updates, reverse Negotiation FK or Case changes.

## 9. Positive staging fixture

One synthetic fixture, no historical roots cloned or modified:

- Tenant: `03824f9e-0924-435e-8b20-50b8ea52774b` (existing homologation).
- Customer: `cd3ef32b-bbe5-4e45-895f-339b411e1227`.
- BuyerProfile: `91c82ffe-7072-45bb-a964-19119d1b5333`.
- Offered trade-in source: `402fc2de-69cc-4dcb-ae5b-f7b93582c123` (not inferred buyer Lead).
- TenantVehicle: `2698c9b1-4c40-4e42-90f4-2429d3d43be1`, available, specification NULL.
- Match: `88b49441-cb45-4089-a48d-1fa30310cced`.
- Creator Membership: `5898a810-dcd1-4ed6-9597-70bdbf61c73d`.
- Responsible Membership: `6fbc268f-9ccc-4aa9-9cb0-45bb949468dd`.
- Negotiation: `3487214d-e395-4573-bf43-c127bd9fea10`.
- Buyer confirmation event: `33b16de2-bde3-4d61-ae9d-d106fe81162c`.

Correct same-Tenant references, creator/assignee, `match_manual/contact/active`, and
supporting identity provenance verified. Optional buyer Lead is absent on retained root.
Other positive paths, buyer Lead agreement/conflict and negative probes rolled back.

The one fixture is retained: shared committed parents were needed for the attempted
cross-session probe; provenance is append-only, so cleanup would require bypassing
approved guards. No bypass/delete was performed. Setup script is staging-only, guarded
against replay. Current totals: Customers 52 (+1), Profiles 53 (+1), Leads 54 (+1),
Matches 254 (+1), TenantVehicles 1 (+1), source links 1 (+1), identity events 1 (+1),
Negotiations 1 (+1), Specifications 0, Cases 51 unchanged, legacy vehicles 52 unchanged.

## 10. API/action integration

Service primitive implemented. No API/UI contract added: existing /matches has no
canonical Tenant/assignee action boundary. Returning ID and created/existing indicator
supports later navigation. Workspace, Case handoff and automation remain outside scope.
Match intelligence snapshots deferred; current schema does not require them.

## 11. Tests / validation

PASS:

- 128 focused automated tests: negotiation, tenant-vehicle, commercial-identity,
  tenant-context/runtime/intake, match-consumer/score, crm-auth, commercial-cases contracts,
  case-auth and case-actions (`node --test` with the corresponding tests/* files).
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- `node node_modules/typescript/bin/tsc -p tsconfig.validation.json --allowImportingTsExtensions --noEmit --incremental false`.
- `npm run build` (Next.js 16.3.5; 31 static pages).
- Changed-file ESLint: schema, negotiation contracts/service, tenant-vehicle service,
  negotiation and tenant-vehicle tests; zero errors/warnings.
- `scripts/validate-start-negotiation.sql`: creation and confirmed provenance,
  active/formalized retries, 18 rejection gates, duplicate-index diagnostics,
  immutable source/vehicle, manual qualification, legacy hash; rollback.
- `scripts/validate-negotiation.sql`: existing manual/closure/provenance/auth
  regressions and 39 rejection probes; rollback. Structural Match fixture now includes
  an explicit canonical vehicle, required by AP005.
- `scripts/validate-tenant-vehicle.sql`: nullable/curated technical identity,
  explicit typed mapping, same-Tenant resolution and 28 rejection probes; rollback
  (run while mapping baseline was empty, before retaining the AP005 fixture).
- Live index, FK, check, locked command definition, permissions and database totals/hash.
- Database lock/uniqueness concurrency evidence per explicit user amendment.
- `git diff --check`; final scoped diff/status review.

No introduced failures. Repository-wide pre-existing lint debt is outside this slice.
Advisor comparison: no new WARN/ERROR. Security INFO RLS/no-policy 16→16; existing
mutable-search-path WARN 4→4, public extension WARN 1→1, password protection WARN 1→1.
Performance unindexed-FK INFO 45→45, auth-RLS WARN 11→11, unused-index INFO 47→45.
Server-only RLS/grants remain deliberate; no broad advisor remediation performed.

## 12. Files changed

- db/negotiation-schema.ts
- lib/negotiation/contracts.ts
- lib/negotiation/service.ts
- lib/tenant-vehicle/service.ts
- drizzle/0032_start_negotiation_from_match.sql
- scripts/validate-negotiation.sql
- scripts/validate-start-negotiation.sql
- scripts/setup-start-negotiation-fixture.sql
- tests/negotiation.test.mjs
- tests/tenant-vehicle.test.mjs
- docs/agents/AP-CRM-005-TASK-CONTRACT.md
- docs/agents/AP-CRM-005-CHECKPOINT.md

## 13. Database changes

0032 applied once to teste2; ledger `20261002111502 / start_negotiation_from_match`.
Preflight showed migration/column absent and negotiations=0. Additive nullable FK/check/
index and restricted invoker resolver/command/guards. No DML/backfill in migration.
Only permanent DML is the explicit isolated fixture and one Negotiation documented above.
Production untouched. Existing numbered migrations and prior foundation remain intact.
CLI migration stub/cache were created as required and removed after verifying their
exact workspace paths and empty-stub size; no generated CLI artifacts included.

## 14. Git diff summary

One bounded persistence/service slice, shared mapping resolver, focused tests and probes,
local task/checkpoint. No dependencies, environment files, unrelated schema/UI/API edits.
Exact staged diff statistics are returned with the result after final review.

## 15. Final repository state

Commit authorized only after all scoped gates pass, including approved concurrency
amendment. Commit message: `feat(crm): start negotiation from match`.
Expected final branch unchanged and status clean; exact final commit reported separately.
No push, no AP-CRM-006 execution, no destructive Git actions.

## 16. Recommendation

READY_FOR_AP-CRM-006.
Legacy Matches remain blocked until independently and explicitly mapped; this slice
adds no mapping campaign. Stop at this checkpoint.

Existing advisor references (pre-existing; no new warning):
[Mutable search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[public extension](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
[auth RLS evaluation](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
