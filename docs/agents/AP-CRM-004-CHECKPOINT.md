# AP-CRM-004 — RESULT

Date: 2026-10-02. Recommendation: **READY_FOR_AP-CRM-004V**.

## 1. Repository state

Branch `fix/crm-runtime-integration`; starting HEAD `3842708d5af0bf28db8173a0339561504af8acc7`; clean working tree, verified before changes. Existing Tenant/identity work was adopted as committed foundation. No restore, reset, clean, force push or existing-work deletion was used.

## 2. Negotiation schema

New `public.negotiations`, centrally exported through `db/schema.ts`. Text UUID `id`, required UUID `tenantId`, required text `customerId`, optional text `leadId`, `buyerProfileId`, `matchId`, required UUID `responsibleMembershipId` and `createdByMembershipId`, bounded text `origin`, `stage`, `lifecycle`, optional bounded `closureReason`, timezone-aware `createdAt`, `updatedAt`, `closedAt`, `formalizedAt`. Optional UUID `buyerProfileIdentityEventId` / `leadIdentityEventId` preserve supporting confirmed-identity events when those origins are supplied. They are captured by the database, immutable, and FK-backed; they are evidence references, not live identity authority or optimistic version tokens.

No Store, vehicle, Match-intelligence snapshot, Case pointer, contact attributes, automation envelope or operational child tables. RLS enabled; public/anon/authenticated table access and function execution revoked. Trusted server DB role remains the persistence boundary, matching the Tenant/identity foundation.

## 3. Tenant ownership

Required Tenant FK; composite `(tenant_id, reference_id)` FKs to Customer, transitional Lead, BuyerProfile and both Memberships. Match Tenant context remains derived through its exact BuyerProfile. Identity-event capture selects same-Tenant, same-origin, same-Customer evidence; append-only events cannot later change their scope. Covering indexes exist for all new root FKs.

`resolveTenantContext` validates the authenticated User's active Tenant/Membership/RoleAssignment. Client Tenant selection is a request, never a grant. The SQL creation function rechecks and locks active Tenant, actor Membership/User and active roles through insertion, avoiding reliance on a completed resolver transaction.

## 4. Customer reference

Exactly one required same-Tenant Customer; no placeholder creation or inferred mapping. Explicit Customer alone supports manual creation. Every supplied identity-bearing origin must have an agreeing confirmed link. Missing/unknown links are UNRESOLVED; disagreeing confirmed links are CONFLICT; both reject insertion. These preserve AP-CRM-003D semantics without another contact-matching authority.

## 5. Lead reference

Optional `leadId` remains `trade_ins.id`; composite same-Tenant FK. Creation locks the Lead root FOR SHARE, serializing with AP-CRM-003D's FOR UPDATE confirmation/correction operation, then requires the current `lead_customer_links.customer_id` to agree. Supporting confirmation event is captured. No new Lead table.

## 6. BuyerProfile reference

Optional generally; required when Match supplied. Same-Tenant FK; creation locks the Profile and requires its confirmed `customer_id` to agree. Supporting confirmation event is captured. Subsequent approved identity corrections preserve existing Negotiation Customer/provenance and before/after event history. Future identity-dependent commands must revalidate and require review on disagreement; no Negotiation correction command is implemented.

## 7. Match reference

Optional real FK to `vehicle_matches.id`, ON DELETE RESTRICT. Match origins require `matchId` plus exact `buyerProfileId`; direct manual/channel origins have no Match. Insert guard locks Match and validates its profile, so identity stays **Match → BuyerProfile → confirmed Customer**. A narrowly scoped parent trigger prevents changing a referenced Match's originating Profile. Existing Match scoring/source intelligence and all current business rows remain unchanged.

Match-origin persistence is structurally prepared and tested with rollback fixtures only. The exposed domain primitive rejects Match origins and `matchId`; no actionable Match creation exists pending AP-CRM-004V and AP-CRM-005.

## 8. Seller/Membership references

Both Memberships are required and independently same-Tenant FK-backed. Creator is derived from authenticated context and may differ from responsible seller. Minimum manual-create policy: active owner/manager/seller may act within validated Tenant; assignee must be an active same-Tenant Membership with active `seller` RoleAssignment. Owner/manager Membership can be assignee only with an explicit seller assignment. SQL revalidation/locks preserve that bounded policy through insertion. Historical Membership references survive revocation; new commands fail closed. No `crm_users.store_id` or legacy seller profile grants authority.

No reassignment, stage-update or lifecycle-update primitive is exposed; future commands require their separately approved capabilities and immutable audit events. Database metadata checks prepare persistence, not those workflows.

## 9. Store/Vehicle decisions

Store omitted: this primitive is tenant-level qualification, with no store-scoped action. Later store-scoped operations must use canonical Store/StoreAccess; null/absence cannot bypass such a requirement.

**Canonical Negotiation vehicle reference: DEFERRED until TenantVehicle persistence exists.** Approved minimum manual persistence needs no vehicle. No legacy `vehicleId`, `vehicles` FK, generic text/source fallback or speculative vehicle column is added. AP-CRM-004V is defined separately; AP-CRM-005 is blocked until it completes.

## 10. Stage / lifecycle / closure

- Stage: `contact`, `qualification`, `negotiation`, `ready_for_formalization`; initial `contact`.
- Lifecycle: `active`, `formalized`, `closed`; initial `active`.
- Pre-Case closure reasons: `lost`, `cancelled`, `expired`, `no_fit`, `inactive_customer`.
- Active: no closure or formalization metadata. Formalized: requires `formalizedAt`, no closure metadata. Closed: requires `closedAt`; pre-Case requires a bounded reason and no formalization timestamp; post-Case retains `formalizedAt` and has no independent operational loss reason.
- Timestamps cannot predate creation; updates maintain `updatedAt`. Future Case handoff/completion owns authorization, linked-Case evidence and transition orchestration. No final transaction outcome is added to Negotiation.

Small CHECK-bounded text sets follow current conventions; no complete future funnel/loss taxonomy is invented. `reactivation` is origin/channel provenance of a new manual root, not a reopen/predecessor workflow. A real reactivation command, retry key and audit policy remain deferred.

## 11. Idempotency support

Unique partial index `(tenant_id, match_id)` while Match is nonnull and lifecycle is `active` or `formalized`. Closed historical contexts release this key. This is structural support for the future Match command, whose retry/reuse and explicit reactivation policy still need implementation. No Customer/vehicle global uniqueness; repeated manual Customer contexts remain valid. The minimum unexposed manual primitive does not claim request-key idempotency.

## 12. Negotiation → Case preparation

No Case schema or workflow change was needed. Canonical future direction remains unique nullable **Case.negotiationId**; no **Negotiation.caseId**. Structural lifecycle probes do not create Case or implement formalization. AP-CRM-007 remains deferred.

## 13. Migration

Applied to **teste2 YES**, project `prcmlynykncfgzwluoef`; production not changed.

| Repository file | Staging ledger version | Name |
|---|---|---|
| `drizzle/0028_negotiation_persistence.sql` | `20261002093035` | `negotiation_persistence` |
| `drizzle/0029_negotiation_closure_metadata.sql` | `20261002093341` | `negotiation_closure_metadata` |
| `drizzle/0030_negotiation_identity_provenance.sql` | `20261002093812` | `negotiation_identity_provenance` |

Preflight established table absence, ledger absence and valid parent keys before 0028. Later additive refinements established zero Negotiation rows and ledger absence before applying. No blind replay, data backfill, destructive row change or foundation redesign. 0029 corrects the initial closed-metadata check to preserve approved post-Case semantics; 0028 remains unchanged because it was already applied. 0030 preserves creation-time identity evidence required by the approved design without a new audit table.

Supabase CLI `migration new` created the stubs; completed SQL follows the repository's existing numbered Drizzle convention. Only those newly generated empty stubs/cache files were removed. Supabase's live ledger is authoritative for staging application status; do not infer application from repository filenames or the older Drizzle journal.

## 14. Persistence/domain primitive

`lib/negotiation/contracts.ts`: strict minimum manual input; Customer and responsible Membership required; supplied references nonempty; client actors, Match initiation, vehicle/Store/state fields rejected.

`lib/negotiation/service.ts`: authenticated server context; server-generated textual UUID; transaction invokes SECURITY INVOKER `create_manual_negotiation` and reads persisted mapped state in that transaction. Database validates/locks authorization, current confirmed identity and supporting provenance. `readNegotiation` filters by validated Tenant and returns null for absent/foreign IDs. No routes, UI, full CRUD, Match start action, automated behavior or Case handoff.

## 15. Tests and validation

- Focused plus Tenant/identity/Match/CRM-auth/Case regression: 115 tests PASS, including 8 Negotiation tests.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS.
- Scoped `tsc -p tsconfig.validation.json --allowImportingTsExtensions --noEmit --incremental false`: PASS.
- `npm run build`: PASS, production build and 31 static pages.
- Changed-file ESLint: zero errors; existing `db/schema.ts` unused `sql` warning retained outside scope.
- `git diff --check`: PASS.
- `scripts/validate-negotiation.sql`: staging PASS; valid creation/read, manual repeats, 39 rejection probes, same-Tenant/reference checks, UNRESOLVED/CONFLICT, immutable source/provenance, pre/post-Case closure, active/formalized Match uniqueness, closed history, corrections and actor/Tenant/seller/role revocation. All fixtures/mutations rolled back.
- Security/performance advisor review: no new warning/error or unindexed new FK. INFO for RLS with no policy is intentional server-only denial; client grants/execution were checked revoked. Fresh unused FK indexes are expected on an empty table. Existing unrelated findings remain outside scope. [RLS/no-policy explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [unused-index explanation](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

The first probe attempt failed on an ambiguous test variable and rolled back; renamed and rerun successfully. Authorization revocation and identity corrections were exercised serially with rollback fixtures; locking was reviewed, but this checkpoint does not claim a multi-connection concurrency stress test or user-interface validation. No new UI exists.

## 16. Files changed

`db/schema.ts`; new `db/negotiation-schema.ts`; `drizzle/0028_negotiation_persistence.sql`, `0029_negotiation_closure_metadata.sql`, `0030_negotiation_identity_provenance.sql`; `lib/negotiation/contracts.ts`, `service.ts`; `tests/negotiation.test.mjs`; `scripts/validate-negotiation.sql`; this checkpoint; `AP-CRM-004V-TENANTVEHICLE-PREREQUISITE.md`; narrow implementation/vehicle-prerequisite annotations on the approved AP-CRM-003 design, preserving its historical finalization status.

## 17. Database changes

One new empty root, its constraints/indexes/RLS, three server-only invoker functions and two narrowly scoped integrity triggers. 0029 refines a root check; 0030 adds two root evidence FKs and strengthens the same identity guard. Existing Tenant/identity schema, confirmed-link functions, Match intelligence and Case behavior remain intact.

Baseline and post-probe counts: Customers 51, BuyerProfiles 52, Leads 53, Cases 51, Matches 253; Lead links 0 and identity events 0. Negotiations 0 after rollback. Combined entire-row business hash over Customers/Profiles/Leads/Cases/Matches stays `965343b607b962d01a649a84987ade29`.

## 18. Git diff summary

Minimum root persistence, same-Tenant/confirmed-source guards, bounded manual create/read, scoped offline and rollback SQL tests, checkpoint and explicitly deferred vehicle prerequisite. No workspace/routes, scoring changes, Case refactor, inferred identity/backfill or TenantVehicle implementation.

## 19. Final repository state

All scoped validations must pass before commit `feat(crm): add negotiation persistence`. Final commit hash and clean status are reported in the task result; this checkpoint is part of that commit. No push/deployment is included.

## 20. Recommendation

**READY_FOR_AP-CRM-004V**. The separate prerequisite is defined in `AP-CRM-004V-TENANTVEHICLE-PREREQUISITE.md`, not implemented or automatically started. AP-CRM-005 must not begin until AP-CRM-004V completes and its own task is authorized.
