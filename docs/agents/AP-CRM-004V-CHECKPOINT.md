# AP-CRM-004V — RESULT

Date: 2026-10-02. **READY_FOR_AP-CRM-005**, subject to per-record gates: all 253 existing legacy Matches remain **UNRESOLVED** and blocked until explicitly mapped. AP-CRM-005 is not started automatically.

## 1. Repository state

`fix/crm-runtime-integration`; starting HEAD `53d59a407eced9eaa8dc608caab974f2ac4c3aad`; clean before inspection and before approved implementation. Initial read-only inspection returned DECISION REQUIRED. The subsequent human decision approved nullable specification, empty canonical persistence, no backfill and no inferred mapping; that is the implementation basis, not permission inferred from legacy data.

Normative inputs: Tenant Model V1, AP-CRM-003 approved design, AP-CRM-004 Negotiation persistence, AP-CRM-004V prerequisite and current vehicle/Match contracts. No Tenant/identity/Case decisions were reopened.

## 2. Current vehicle model

Legacy `vehicles` has text IDs and mixes technical labels/codes with plate/chassis, inventory scope, partner, owner, prices/costs and operational lifecycle. There is no physical Tenant column. Inventory UI (`/estoque` redirects to `/veiculos`), vehicle API and intelligence continue using these IDs. Case/proposals/media/lifecycle/costs/publications/delivery and optional Match vehicle FKs still target it. `vehicles.source_negotiation_id` actually references `trade_ins`, not the new canonical Negotiation.

Current Matches use `source_type/source_id`: 171 inventory Matches have matching legacy `vehicle_id` and `source_id`; 82 trade-in Matches refer to same-Tenant `trade_ins` and have no legacy vehicle ID. Current generation also supports consignment sources; no live Match uses that type. No earlier canonical VehicleSpecification/TenantVehicle table or matching migration was found.

## 3. TenantVehicle schema

New `tenant_vehicles`: text UUID `id`, required UUID Tenant FK, nullable text `vehicle_specification_id` FK to global specification, bounded `status` (`qualification`, `available`, `unavailable`), required same-Tenant creator Membership, bounded immutable registration reason, timezone-aware created/updated timestamps. `(tenant_id,id)` is unique for composite FKs; creator/specification FKs have covering indexes.

One registered row denotes one explicitly reviewed physical/commercial unit owned by exactly one Tenant. No technical specification is copied into it. No legacy ID becomes its canonical ID. No Store or full inventory lifecycle is added. This is tenant-level registration; later Store-scoped inventory actions must enforce StoreAccess separately. Ownership and creation provenance are immutable; updates maintain `updated_at`, but no status/transfer/update command is exposed.

Default qualification fails closed for actionability. Only explicitly declared `available` is actionable; technical identity may remain null under the approved decision. Availability does not prove seller access, Customer identity, vehicle reservation or Negotiation-creation authorization.

## 4. VehicleSpecification relationship

New `vehicle_specifications` is a global technical identity with an opaque text UUID, reviewed brand/model designation, model year, optional known fuel/transmission, bounded technical evidence source/reference and timestamps. It has no Tenant, Membership, physical identifier, commercial price, partner, Store, ownership or legacy/FIPE key. `model` may describe the reviewed model/version designation; incomplete or uncertain technical evidence requires a null TenantVehicle specification reference.

No automatic specification-ingestion or creation primitive is exposed. Only separately reviewed sufficient technical evidence may justify inserting a curated global record; nonempty strings alone are not proof of verification. Public technical references must not carry Tenant activity or PII. FIPE/legacy codes and brand/model strings remain evidence. No deterministic FIPE key, deduplication, extraction or legacy promotion is performed. Global does not mean public API access; this initial persistence remains server-only. Zero specifications were created persistently.

## 5. Existing vehicle data

52 rows: 10 pilot-prefixed, 40 phase2-prefixed and two other IDs. Markers support a fixture/pilot interpretation for 50 rows, not verified provenance for all 52. There are no duplicate nonempty normalized plates/chassis. Technical data has 51 distinct FIPE/year pairs with no conflicting stored technical tuples; only 12 rows have numeric brand/model codes and two have structured year codes accepted by current registration validation. None is automatically verified as specification identity.

50 vehicles have persisted Case/customer/Lead Tenant context; two have none. No conflicting context Tenants were observed, but context is not an approved ownership inference. No legacy ownership was assigned. **Legacy rows migrated = 0; inferred mappings = 0; persistent explicit mappings = 0.**

## 6. Legacy coexistence

CURRENT: legacy inventory/API/intelligence and Case relations retain their existing read/write ownership. TRANSITIONAL: a separate immutable `tenant_vehicle_source_links` adapter connects an explicitly reviewed source to the canonical root. CANONICAL: future tenant-scoped commercial references use TenantVehicle; VehicleSpecification only enriches technical facts.

The link has exactly one typed source FK: `inventory_vehicle_id` → legacy vehicles, `trade_in_id` → same-Tenant trade_ins, or `consignment_id` → legacy consignments. Required TenantVehicle and confirming Membership have composite same-Tenant FKs. Each source has one globally unique confirmed mapping; one canonical vehicle can have several distinct source references. All FKs are restrictive and indexed.

Confirmation records actor Membership, time and bounded ownership-review reason. Inventory/consignment roots currently lack Tenant ownership; an explicit owner/manager review establishes the bridge's assertion, never Store/partner/Case/contact/label inference. Trade-in ownership must additionally agree with its persisted Tenant. Mapping updates/deletes are rejected; correction/transfer needs a separately authorized audited command. No existing mapping was generated by this slice.

Avoid dual-write: legacy commands do not automatically create/update canonical rows; canonical primitives do not update legacy rows, intelligence, sources or Case data. Global specification curation, canonical availability changes and later migration/write-routing remain separately governed work, not automatic synchronization.

## 7. Match integration

The existing source abstraction is preserved. Read resolution follows **Match → exact typed source link → same-Tenant TenantVehicle → optional global VehicleSpecification**. Match Tenant derives from its BuyerProfile. Contradictory inventory source/vehicle IDs fail closed. Missing, unsupported or foreign mappings return UNRESOLVED; inaccessible Match itself is an authorization failure. No physical row is fabricated on read.

An explicitly mapped same-Tenant available canonical vehicle resolves and is actionable even with specification null. Qualification/unavailable vehicles may resolve identity but are not actionable. New canonical registration can establish available physical identity; a current Match additionally needs an explicit source link. No new Match source kind, scoring input, score, reason, intelligence snapshot or generation action is introduced.

`resolveMatchVehicleInTransaction` composes with a caller-owned authorized transaction and locks Match/Profile/link/vehicle through that read. The public wrapper authenticates and opens a read transaction. A returned snapshot is not a durable authorization or freshness token; AP-CRM-005 must revalidate actor, Customer identity and vehicle/duplicate/availability gates and keep relevant locks through persistence.

## 8. Negotiation preparation

Canonical FK target available **YES**. No Negotiation field/FK or Case change was necessary. Future AP-CRM-005 can reference the canonical root with same-Tenant integrity; it must respect the still-unresolved legacy source gate. Manual Negotiation qualification remains valid without a vehicle. No Match-start action, workspace, Case formalization or automation was built.

## 9. Migration

`drizzle/0031_tenant_vehicle_canonical_persistence.sql`, applied to **teste2 YES**, project `prcmlynykncfgzwluoef`, ledger version **20261002101210**, name `tenant_vehicle_canonical_persistence`. Production not touched.

Preflight verified all three canonical targets and ledger entry absent, existing rows/references and parent keys, unchanged hashes and additive empty-table creation. Migration creates only new tables/indexes/RLS/invoker functions/triggers; no backfill, source mapping, legacy column changes or existing Match writes. Supabase CLI `migration new` generated the stub before authoring; completed SQL uses the existing numbered repository convention. Only the newly created empty CLI stub/cache files were removed. Live migration ledger is authoritative; file presence does not prove application.

All three tables enable RLS and revoke public/anon/authenticated access. Five new functions use SECURITY INVOKER and fixed empty search_path, with client execution revoked. Trusted server DB role is the persistence boundary, following the Tenant/identity/Negotiation foundation.

## 10. Tests and validation

PASS: 125 focused/foundation tests (10 new TenantVehicle tests); full typecheck; scoped typecheck; production build with 31 static pages; changed-file lint (zero errors, retained pre-existing unused `sql` warning in `db/schema.ts`); working/staged `git diff --check`.

Commands:

```powershell
node --test tests/tenant-vehicle.test.mjs tests/negotiation.test.mjs tests/commercial-identity.test.mjs tests/tenant-context.test.mjs tests/tenant-runtime.test.mjs tests/tenant-intake.test.mjs tests/match-consumer.test.mjs tests/match-score.test.mjs tests/crm-auth.test.mjs tests/commercial-cases-contracts.test.ts tests/case-auth.test.ts tests/case-actions.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/typescript/bin/tsc -p tsconfig.validation.json --allowImportingTsExtensions --noEmit --incremental false
npm run build
node node_modules/eslint/bin/eslint.js db/tenant-vehicle-schema.ts db/schema.ts lib/tenant-vehicle/contracts.ts lib/tenant-vehicle/service.ts tests/tenant-vehicle.test.mjs
git diff --check
```

`scripts/validate-tenant-vehicle.sql` staging PASS: actual create/read with null and curated specification FK; explicit inventory/trade-in/consignment confirmation; actionable same-Tenant Match and foreign Match unresolved; 28 rejection probes covering Tenant/creator/FKs, invalid specification/status/evidence, immutable ownership/mapping, duplicate/conflicting source, wrong actor/User/role, unknown source, cross-Tenant source/vehicle and suspended Tenant/Membership/revoked role. All fixture rows and simulated mutations rolled back. Ordinary authenticated/anon client access/execution denied.

Advisor comparison: no new warnings/errors or unindexed new FK. INFO [RLS/no-policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is intentional server-only denial; client privileges were checked. INFO [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) on newly empty tables are expected and retain FK coverage. Unrelated baseline findings are outside scope.

Locks were reviewed and authority revocation probed serially; no multi-connection concurrency stress test or UI validation is claimed. No new UI exists.

## 11. Files changed

`db/schema.ts`; new `db/tenant-vehicle-schema.ts`; `drizzle/0031_tenant_vehicle_canonical_persistence.sql`; `lib/tenant-vehicle/contracts.ts`, `service.ts`; `tests/tenant-vehicle.test.mjs`; `scripts/validate-tenant-vehicle.sql`; this checkpoint; completion annotation on `AP-CRM-004V-TENANTVEHICLE-PREREQUISITE.md`.

Primitives: `registerTenantVehicle`, `readTenantVehicle`, `confirmTenantVehicleSource`, `resolveMatchTenantVehicle` and internal transactional resolver. Register/confirm derive authenticated Tenant/actor and recheck/lock active Tenant, Membership/User and owner/manager role through writes; seller may use authorized tenant-scoped read resolution but cannot register/confirm. This is a bounded policy for these primitives, not a complete inventory permission matrix. Strict input rejects legacy/FIPE inference and caller-owned actor fields.

## 12. Database changes

Three new empty tables, their constraints/indexes/RLS, five server-only invoker functions and two integrity/provenance triggers. No existing vehicle, Match, Tenant/identity, Negotiation or Case rows changed. Existing vehicle/Match contracts remain operational.

Before/after: legacy vehicles **52**, Matches **253**. New specification/vehicle/link rows **0 / 0 / 0**, Negotiations **0**. Entire-row hashes unchanged:

- Legacy vehicles: `420af230fc1427ae9e62c8e413393e77`.
- Existing Matches: `01f19aa56e0d695af474cadfe3580832` (includes score/reasons and all other fields).

All 253 existing Match sources remain unmapped and therefore UNRESOLVED; no inferred ownership or identity was persisted.

## 13. Git diff summary

Minimum canonical persistence, typed explicit adapter, bounded server create/read/confirm/resolve primitives, offline and rollback staging tests, completion/checkpoint documentation. No legacy inventory migration, complete specification duplication, scoring change, Negotiation FK/workspace, Case semantic change or AP-CRM-005 behavior.

## 14. Final repository state

Commit only after scoped validation passes: `feat(vehicle): add tenant vehicle persistence`. Commit hash and final clean status are reported in the task result; this document is included in that commit. No push/deployment or Production write.

## 15. Recommendation

**READY_FOR_AP-CRM-005** for separately authorized implementation against validated canonical vehicles. **Legacy Matches remain blocked until explicit same-Tenant source mapping**, independently of nullable technical identity and Customer-resolution gates. No AP-CRM-005 task or behavior is started automatically.
