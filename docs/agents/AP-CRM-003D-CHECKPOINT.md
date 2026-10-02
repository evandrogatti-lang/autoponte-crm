# AP-CRM-003D — RESULT

Date: 2026-10-02 Europe/Berlin.

## 1. Repository state and adoption review

Branch `fix/crm-runtime-integration`; starting HEAD `df504cc395000f02e6d82d2186b7da64d6ffbb2b`.
The user explicitly approved adoption of the existing work. Modified: `db/pilot-schema.ts`, `db/schema.ts`. Untracked: Customer/identity schema modules, migration 0026, `lib/commercial-identity/`, migration-basis document and the Negotiation design. All existing implementation files and the tracked diff were read before editing. No existing work was discarded or recreated. The Negotiation design remains untouched and excluded from the commit.

The adopted design was consistent with the approved identity model and did not implement Negotiation. Completion fixed the missing central schema export, reconciled the Match lookup index, handled wrapped Postgres conflict errors, and corrected a trigger record-field bug found during rollback-only DDL rehearsal. A subsequent foundation regression probe found overly broad BuyerProfile Tenant immutability; a separately recorded 0027 correction restores established Tenant constraint behavior while retaining immutable Lead mapping ownership. No Customer fields, Case semantics, scoring, routes or Tenant Model V1 definitions were redesigned.

## 2. BuyerProfile → Customer

Nullable `buyer_profiles.customer_id`, with composite FK `(tenant_id, customer_id)` → `customers(tenant_id, id)` and ON DELETE RESTRICT. No uniqueness on Customer. Null remains unresolved. Confirmation changes require explicit same-transaction provenance. Existing intake inserts default to null; contact similarity and fixture IDs never assign identity.

## 3. Lead → Customer

`trade_ins` remains the Lead root. `lead_customer_links` is a dedicated current association, not a new domain entity. `lead_id` is its PK, allowing at most one current Customer per Lead and multiple Leads per Customer. Composite Tenant/Lead and Tenant/Customer FKs enforce ownership. Corrections update the current association; withdrawal removes it, preserving event history. Root locks and expected previous Customer serialize confirmations and reject stale reassignment.

## 4. Identity provenance

Append-only `identity_link_events` records origin, Tenant, actor Membership, timestamp, source, reason, previous Customer and resulting Customer, including null withdrawals. Composite FKs retain origin/Customer/Membership integrity. UPDATE/DELETE triggers reject history rewrites. Relationship-change triggers require matching provenance in the current transaction from an active Membership with an active role. The confirmation function validates the server-resolved User, Membership, active Tenant and role; it locks these authorization rows during confirmation. Functions use SECURITY INVOKER and fixed search_path. Direct client access to new tables/functions is revoked; RLS is enabled with no client policies by design.

## 5. Identity resolution

Reusable server contract: `resolveCommercialIdentity` and `confirmCommercialIdentity` in `lib/commercial-identity/service.ts`, with confirmed-source aggregation in `contracts.ts`.

- RESOLVED: exactly one authorized confirmed Customer and every supplied identity-bearing origin agrees.
- UNRESOLVED: no confirmed Customer, or a supplied origin remains unknown. An explicitly selected Customer does not implicitly confirm supplied unknown origins.
- CONFLICT: differing confirmed Customers or a stale confirmation expectation; wrapped SQLSTATE 40001 is preserved as `IdentityConflictError`.

Tenant/access failures throw, rather than returning CONFLICT. Candidate evidence is excluded from the confirmed-only input contract. Manual resolution can select an existing authorized Customer; a newly created Customer can subsequently be selected, and explicit candidate confirmation uses the same audited relationship confirmation. This slice adds neither placeholder creation nor a new manual/Negotiation UI. Null is unknown, not rejected/false.

## 6. Match integration

The live `vehicle_matches_buyer_profile_id_fkey` already existed with ON DELETE CASCADE. Historical Match DDL and Drizzle differed; Drizzle now declares the FK and lookup index, while migration 0026 preserves/ensures the live FK. Match Customer identity is derived exclusively from its authorized BuyerProfile. An optional Lead must have a matching confirmed relationship. Unresolved and conflicting identity cannot satisfy the resolution contract for future creation.

Match guards check coherence against existing typed trade-in and Case Tenant roots, including later ownership updates. Global catalog and tenantless legacy source semantics remain unchanged. No Customer/Tenant authority was copied onto Match and no scoring changes were made.

## 7. Existing fixture handling

All 52 BuyerProfiles and 53 Leads remain unresolved. Historical CustomerIntent/Case associations describe local workflow and lack authenticated general identity confirmation provenance. Fixture-family patterns and contact values are not confirmation evidence. The approved option to leave data unresolved was used; no speculative identity migration or new fixture policy was introduced.

## 8. Migration impact

Before writing, live inspection and migration history independently established that 0026 was unapplied. The full corrected DDL plus behavioral probes passed in a rollback-only rehearsal before application. No blind replay occurred.

Persistent business-row assignments: **0**. All 52 profiles receive a nullable column with null values; 0 Lead mappings and 0 events remain. New schema objects, constraints, indexes and triggers are persisted. All test confirmations/corrections, synthetic cross-Tenant roots and Match probes rolled back. Five ordered business-row hashes (Customers, BuyerProfiles excluding only customer_id, Leads, Cases and Matches) equal their before-state hashes in the migration-basis document.

## 9. Tests / validation

- `node --test tests/commercial-identity.test.mjs tests/tenant-context.test.mjs tests/tenant-runtime.test.mjs tests/tenant-intake.test.mjs tests/*match*.test.mjs tests/*case*.test.mjs` — PASS, 87 tests (the Case .ts tests are separately covered below).
- `node --test tests/case-auth.test.ts tests/case-actions.test.ts tests/commercial-cases-contracts.test.ts tests/crm-auth.test.mjs` — PASS, 20 tests. Total focused/regression tests: 107.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — PASS.
- `node node_modules/typescript/bin/tsc -p tsconfig.validation.json --allowImportingTsExtensions` — PASS.
- `node node_modules/eslint/bin/eslint.js db/customer-schema.ts db/identity-schema.ts db/schema.ts db/pilot-schema.ts lib/commercial-identity/contracts.ts lib/commercial-identity/service.ts tests/commercial-identity.test.mjs` — PASS, zero errors and the pre-existing unused sql-import warning in db/schema.ts. The initial new-test variable lint error was corrected before the passing run. Repository-wide lint debt remains out of scope.
- `npm run build` — PASS, compiled, typechecked and generated application routes.
- `scripts/validate-commercial-identity.sql` executed against teste2 — PASS: same-Tenant positive confirmations, cross-Tenant rejection, duplicate current Lead rejection, stale reassignment conflict, history retention/immutability, wrong User rejection, unaudited correction rejection, Match FK/path, cross-Tenant Match rejection, unresolved withdrawal and unchanged business hashes. All writes rolled back.
- `scripts/validate-crm-tenant-ownership.sql` against teste2 — PASS after 0027: existing Case coherence, cross-Tenant rejection, original NOT NULL behavior and persisted public routing.
- Live post-probe checks: Customers 51, profiles 52 (all null Customer), Leads 53, Cases 51, mappings/events 0; zero tenantless roots/probe rows; both public routes retain approved Tenant, active status and null Store.
- Supabase security advisors reviewed: new tables have intentional INFO notices for RLS without client policies. Existing search_path/extension/password warnings remain unrelated; all new functions have fixed search_path, and anon/authenticated cannot execute confirmation.
- `git diff --check`, tracked diff review and status inspection — PASS. Full staged diff reviewed before commit.

Runtime staging validation here exercises the actual persisted Postgres confirmation/guard functions, with the authenticated server adapter tested through controlled dependencies. No new user-facing flow exists in this slice; no new Preview deployment, HTTP identity endpoint or browser confirmation flow is claimed. The completed Tenant Preview validation remains the prior checkpoint.

## 10. Files changed

`db/customer-schema.ts`, `db/identity-schema.ts`, `db/pilot-schema.ts`, `db/schema.ts`, `lib/commercial-identity/contracts.ts`, `lib/commercial-identity/service.ts`, `drizzle/0026_commercial_identity_links.sql`, `drizzle/0027_identity_trigger_tenant_compatibility.sql`, `scripts/validate-commercial-identity.sql`, `tests/commercial-identity.test.mjs`, `docs/agents/AP-CRM-003D-MIGRATION-BASIS.md`, and this checkpoint.

## 11. Database changes

Only teste2 (`prcmlynykncfgzwluoef`):

- `20261002085314` — `commercial_identity_links`, repository source 0026.
- `20261002085623` — `identity_trigger_tenant_compatibility`, repository source 0027.

Prior migration ledger entries remain intact. Existing Drizzle journal omissions are not used to claim these administrative deployments. Do not replay these files or use db:push against staging. Production was not accessed or deployed.

## 12. Git diff summary

Additive nullable profile identity, current Lead association, append-only provenance, confirmed-only Tenant-authorized service contract, Match FK reconciliation, focused tests and rollout evidence. Customer schema was extracted unchanged to avoid adding circular Customer ownership definitions; pilot-schema preserves its existing re-export contract.

## 13. Final repository state

Checkpoint commit uses `feat(crm): normalize commercial identity links`, after validation. Branch remains `fix/crm-runtime-integration`. Exact final SHA is reported in the chat result. Intended remaining status: only the previously untracked `docs/agents/AP-CRM-003-NEGOTIATION-PERSISTENCE-DESIGN.md`.

## 14. Recommendation

READY_TO_FINALIZE_AP-CRM-003

Stop at this identity checkpoint. Negotiation and AP-CRM-004 remain unimplemented.
