# AP-CRM-003 — Negotiation Persistence Design

## Status

APPROVED — NOT IMPLEMENTED

This status records the AP-CRM-003 documentation-finalization checkpoint. The separately authorized AP-CRM-004 minimum persistence implementation is recorded in [AP-CRM-004-CHECKPOINT](AP-CRM-004-CHECKPOINT.md); the full workspace and command flows below remain deferred.

The Negotiation persistence contract is approved. The Tenant and commercial-identity prerequisites are satisfied by AP-CRM-003A through AP-CRM-003D. Negotiation schema/migration implementation has not started: `negotiations` and its children do not exist in the current application schema. AP-CRM-004 remains the next implementation slice and requires its own authorization; this finalization does not start it. Exact enum values, physical constraint syntax and operation-specific capability policies remain bounded implementation details where identified below.

## Repository State

- Finalization date: 2026-10-02 Europe/Berlin
- Repository: `C:\AutoPonteDev\autoponte_work`
- Branch: `fix/crm-runtime-integration`
- Original design baseline HEAD: `ae471c3c189522abb2d2c4a6747c8b78bf94ea4c`
- Finalization starting HEAD: `e73f1a2afd7c013fb57702fd1497213496a4ef42`
- Finalization starting status: only this design file untracked

## Normative Sources

- [AP-CRM-002-DECISION](AP-CRM-002-DECISION.md): APPROVED DOMAIN BASELINE.
- [TENANT_MODEL_V1_PROPOSED](../TENANT_MODEL_V1_PROPOSED.md): TENANT MODEL V1 — APPROVED; restored exactly from `1c0c07ee639ae655a09daf13d6641530a993a884`.
- AP-CRM-003B conclusion, recorded in the AP-CRM-003C task baseline: **C — normalization required before Negotiation persistence**; existing Customer is the preferred persistent identity.
- AP-CRM-003C conclusions, retrieved from the prior **Design commercial identity bridge** chat: retain Customer, Lead and BuyerProfile as separate concepts; require confirmed same-Tenant identity, optional demand/profile origins and conditional Match provenance. No new identity domain entity is required.
- [AP-CRM-003D1D-CHECKPOINT](AP-CRM-003D1D-CHECKPOINT.md) and [Preview validation](AP-CRM-003D1D-PREVIEW-VALIDATION.md): Tenant foundation implemented at `8d2a7a1` and runtime validation recorded at `df504cc`.
- [AP-CRM-003D-CHECKPOINT](AP-CRM-003D-CHECKPOINT.md) and [migration basis](AP-CRM-003D-MIGRATION-BASIS.md): identity normalization implemented and validated at `e73f1a2`.
- Current implementation: [Tenant runtime](../../lib/tenant-runtime.ts), [identity resolution](../../lib/commercial-identity/service.ts), [resolution states](../../lib/commercial-identity/contracts.ts), [identity schema](../../db/identity-schema.ts), [Customer schema](../../db/customer-schema.ts) and [core schema](../../db/schema.ts).

Approved flow: Lead → Match → Negociação → Case / Checkout → Outcome. Tenant Model V1 governs organizational identity, membership, StoreAccess and vehicle separation. AP-CRM-002 governs commercial ownership and incremental coexistence. The older tenant document's historical assumption of no production data does not authorize deletion or imply a current inventory of data. No automatic backfill is proposed.

## Current vs Canonical Model

| Area | CURRENT implementation | APPROVED canonical model | Future Negotiation relationship |
|---|---|---|---|
| Commercial workspace | `trade_ins` plus opportunity service/events | Dedicated Negociação; Lead remains demand | `negotiations` root with operational children |
| Seller | Canonical Membership/RoleAssignment runtime implemented; seller extension still `seller_profiles.crm_user_id` → `crm_users` | Auth User → active tenant Membership → separate RoleAssignment; StoreAccess when required | Responsible Membership on Negotiation; profile extension tied to Membership |
| Store | Canonical Stores/StoreAccess implemented; legacy `crm_users.store_id` text remains | Store subordinate to Tenant; separate StoreAccess | Optional scoped Store reference validated within Tenant |
| Vehicle | Hybrid `vehicles`, Match `sourceType/sourceId` and optional `vehicleId` | TenantVehicle physical/commercial; VehicleSpecification global technical catalog | Negotiation references same-tenant TenantVehicle |
| Buyer / demand | Tenant-scoped `customers`, nullable `buyer_profiles.customer_id`, current `lead_customer_links` rooted in `trade_ins`; append-only provenance | Customer owns identity; BuyerProfile owns preferences/consent; Lead owns demand | Required resolved Customer, optional confirmed profile and Lead references |
| Checkout | `commercial_cases` links legacy opportunity, customer, vehicle and seller profile | Case follows explicit formalization and owns final transaction outcome | Case references Negotiation with unique linkage |

Evidence inspected across this design cycle includes the files above, `db/pilot-schema.ts`, `db/vehicle-schema.ts`, the opportunity services, Match engine, Case contracts/service, authentication and legacy seller/access wiring. Tenant Core, root ownership, server-side Tenant resolution, public intake routing and identity normalization are now implemented and validated. This does not claim that every legacy endpoint, seller profile or hybrid vehicle has already been converted to the canonical model.

## Approved Negotiation Entity and Responsibility

Canonical domain name: `Negotiation` / Negociação. Approved future table: `negotiations`; not implemented.

Canonical flow: **Lead → Match → Negotiation → Case / Checkout → Outcome**. This is a responsibility graph, not a requirement to fabricate every preceding entity. Negotiation is the persistent commercial workspace and owns responsible seller, Customer reference, commercial stage, communications, notes, next actions, follow-ups, objections, document requests, commercial approvals/exceptions, commercial context and operational history. Customer remains the owner of persistent identity attributes. Match retains its intelligence; Case owns final transaction outcome once it exists.

Use an opaque UUID generated server-side, represented as text following existing commercial table IDs and `crypto.randomUUID()` creation patterns. Foreign-key types must match their targets: Tenant, Store, Auth User and Membership keys are UUID; current Customer, BuyerProfile, legacy Lead and Match keys are text. TenantVehicle's physical key must match its separately established canonical persistence.

Negotiation is a tenant-scoped root with physical `tenantId`. It is not a renamed `trade_ins` row. Child records normally derive tenant through their Negotiation FK, following Tenant Model V1; additional tenant materialization requires a structural justification and relational consistency enforcement.

## Tenant and Access Scope

- Use the implemented `resolveTenantContext` to validate the requested active Tenant against authenticated User, active persisted Membership and RoleAssignment on the server. A client selection can request context, never authorize it.
- Tenant cannot be inferred from email, legacy global role, `crm_users.store_id`, `partnerId`, or `inventoryScope`.
- `storeId` is optional for tenant-level work and required when an operation is explicitly store-scoped. Null does not grant unrestricted access or bypass a Store requirement.
- Store, responsible Membership, customer/profile, Lead, Match, TenantVehicle and linked Case must belong to the same Tenant whenever present. Intended future database integrity must prevent mismatched relationships, not rely solely on application filtering.
- Owner has implicit access to Stores in its Tenant. Manager/seller require applicable StoreAccess for store-scoped work. None has access to another Tenant by role alone.
- The actor and responsible seller are checked separately. Assignment does not grant the acting user access, and authentication alone does not grant membership.
- Manager/owner visibility follows authorized tenant/store capabilities; seller assignment does not substitute for authorization. AP-CRM-004 must define the bounded action-permission matrix before enabling those commands, without reopening Tenant Model V1.

Required coherence is `Negotiation.tenantId = Customer.tenantId = Lead.tenantId when supplied = BuyerProfile.tenantId when supplied = Match-related Tenant context = TenantVehicle.tenantId when supplied`. Current Match Tenant context is derived through BuyerProfile and validated against its required Tenant-bearing origins; do not assume a physical `vehicle_matches.tenant_id` exists or add one by implication.

## Seller Identity Model

1. Authenticated User is the stable identity, not email as an ownership key.
2. Membership proves active belonging to the selected Tenant.
3. Separate RoleAssignment proves the allowed tenant role/capability.
4. StoreAccess proves store-scoped access for manager/seller; owner uses the approved implicit rule.
5. An optional seller profile may hold specialties/capacity and other domain attributes, but must be reconciled to canonical Membership and cannot grant access.

Require `responsibleMembershipId`, distinct from immutable creation actor. Validate active same-Tenant membership and commercial responsibility eligibility at assignment and reassignment. Seller RoleAssignment is the normal seller proof; owner/manager responsibility eligibility and Store-required actions must be specified in AP-CRM-004's operation policy before enabling assignment. The existing Tenant runtime accepts active owner/manager/seller roles for its current operations; that does not silently grant every future Negotiation capability.

Reassignment updates the responsible reference and writes an immutable event with old/new Membership, actor, timestamp and reason. Historical references remain when a Membership becomes inactive; inactivity blocks new authorized actions and triggers operational reassignment handling, not deletion of history.

LEGACY ADAPTER BOUNDARY: `seller_profiles` still references `crm_users`, and legacy access checks remain in use outside the completed Tenant slice. Negotiation uses implemented canonical Membership keys. Seller-profile extension/adaptation must preserve that authority; `crm_users.store_id` is never membership or authorization evidence.

## Vehicle Identity Model

AP-CRM-004 vehicle decision (approved 2026-10-02): **Canonical Negotiation vehicle reference: DEFERRED until TenantVehicle persistence exists.** The minimum root has no vehicle column or legacy fallback. Manual qualification persistence is valid without vehicle. [AP-CRM-004V — TenantVehicle Canonical Persistence](AP-CRM-004V-TENANTVEHICLE-PREREQUISITE.md) is a separate prerequisite; AP-CRM-005 must not begin until AP-CRM-004V is complete.

`tenantVehicleId` references the canonical physical/commercial TenantVehicle, not the global VehicleSpecification. TenantVehicle indirectly provides technical specification. Never use partner or inventory scope as ownership proof.

Allow no selected vehicle during manual qualification. Require a same-tenant TenantVehicle when initiating inventory-backed work from an actionable Match and before formalizing a vehicle-sale Case. Selection/change is audited; changing vehicle cannot rewrite the originating Match or its creation snapshot.

IMPLEMENTATION GATE: Match may reference trade-in/consignment sources or legacy hybrid `vehicles` IDs. Canonical TenantVehicle persistence/mapping is not supplied by AP-CRM-003D. An explicit mapping must resolve the TenantVehicle and its Tenant before actionable Match-originated creation or vehicle-sale Case formalization. This gate does not block approval of the persistence design or invent a legacy fallback. Unresolved vehicle context blocks the relevant operation. Do not manufacture TenantVehicle identity from a label, plate, global specification, partner, or inventory scope. Vehicle persistence is not redesigned in this documentation slice.

## Source / Origin Model

Use a bounded origin record with independent initiation kind and channel rather than one overloaded enum:

- `originKind`: `match_manual`, reserved future `match_automated`, or `manual`.
- `sourceChannel`: optional source code, supporting `whatsapp`, `phone`, `walk_in`, `marketplace`, `reactivation`, other registered channels, and explicit unknown when provenance is unavailable.
- `matchId`: required for Match origins, absent for direct manual creation.
- `leadId`: optional independent demand origin, backed by `trade_ins` during transition; never substitute a Match or offered trade-in vehicle source for the buyer's Lead.
- `startedBy`: human Membership or authorized system identity; automation metadata is separately reserved.

Origin is immutable creation provenance; later communications do not overwrite it. Manual creation needs no fabricated Match. Channel classification is not consent or automation authorization.

## Relationships

All future FKs require same-Tenant integrity where applicable. Canonical target concepts without current physical tables are explicitly deferred targets, not existing FKs. Customer may have 0..N Leads and 0..N BuyerProfiles; neither relationship is one-to-one.

| Relation | Cardinality | Required? | Canonical owner | Current status | Notes |
|---|---|---|---|---|---|
| Tenant → Negotiation | 1:N | Yes | Tenant owns organization; Negotiation owns work | Tenant implemented; future Negotiation FK | Immutable physical Tenant key |
| Store → Negotiation | 1:N | Conditional | Store | Store/StoreAccess implemented; future FK | Null for genuinely tenant-level work; same Tenant |
| Membership → responsible Negotiation | 1:N | Yes | Membership owns participation | Membership implemented; future FK | Separate role/access validation |
| User / Membership → created Negotiation | 1:N | Human creation requires actor | Auth / Membership | Auth/Membership implemented; future actor references | System creation has authorized system identity; no fake Membership |
| Lead → Negotiation | 1:N | No | Lead owns demand | `trade_ins` Tenant root and confirmed Customer mapping implemented | Optional `leadId` FK to `trade_ins` during transition; identity must agree |
| Customer → Negotiation | 1:N | Yes | Customer owns commercial identity | Tenant ownership and confirmed identity bridges implemented | Required same-Tenant FK and RESOLVED creation gate |
| BuyerProfile → Negotiation | 1:N | Optional generally; required for profile/Match origin | BuyerProfile owns preferences/consent | Tenant root and nullable confirmed Customer FK implemented | Preserve originating Match profile; confirmed Customer must agree |
| Match → Negotiation | 1:N historical; at most one equivalent open context | Required for Match origin | Match owns intelligence | BuyerProfile FK/coherence reconciled; actionable vehicle mapping remains gated | Future FK; no automatic conversion |
| TenantVehicle → Negotiation | 1:N | Conditional | TenantVehicle owns physical/commercial vehicle | Approved concept; mapping deferred | Required for actionable inventory Match and sale formalization |
| Negotiation → Case | 1:0..1 | No until formalization | Case owns checkout | Future `commercial_cases.negotiationId` FK | Unique when populated; legacy Cases may initially remain unlinked |
| Automation run → Negotiation | Deferred | Only future automated origin | Automation add-on | No target defined here | Logical run reference reserved; no invented automation FK |

Buyer identity is not Lead identity. Confirmed Customer/profile linkage and current Lead mapping are implemented, with Membership, timestamp, reason/source and append-only before/after history. No automatic merge by name, email, phone or fixture-family IDs is allowed. `customer_intents` and Case-local associations are advisory evidence, not general identity confirmation. Lead references must never be assigned to an offered trade-in merely because its ID appears as Match source.

## Identity-Resolution Creation Gate

Use AP-CRM-003D's reusable `resolveCommercialIdentity` contract, not contact grouping or a second resolver:

| State | Negotiation creation |
|---|---|
| `RESOLVED` | Eligible only after all other authorization, vehicle, duplicate and operation gates pass; exactly one confirmed same-Tenant Customer and every supplied identity-bearing origin agrees |
| `UNRESOLVED` | Blocked: missing confirmed link, unknown supplied origin or advisory candidates only |
| `CONFLICT` | Blocked: confirmed sources disagree or a confirmation expectation is stale |

Tenant/access failure is authorization failure, not CONFLICT. Unknown is distinct from false/rejected and from consent status.

For Match origin, resolve **Match → BuyerProfile → confirmed Customer**; preserve that exact `buyerProfileId`, require `matchId`, and validate any separately supplied Lead against the same Customer. Match has no competing mutable Customer ownership. For manual origin, explicitly select an authorized existing Customer, explicitly create Customer first, or confirm a valid reviewed identity candidate. Any supplied Lead/Profile requires an agreeing confirmed relationship. No placeholder Customer or fabricated Match is permitted.

AP-CRM-004/AP-CRM-005 creation must revalidate and protect these references transactionally through persistence; the current resolver's completed read transaction is not a durable creation authorization token. Record the supplied source IDs, confirmed Customer and applicable confirmation-event provenance observed by the future creation transaction. The current resolver returns resolution state and confirmed-source values; it does not return a durable linkage version/event token. Later profile/Lead corrections do not silently change `Negotiation.customerId`: preserve creation provenance, require review before further identity-dependent actions when current origins disagree, and use a separate authorized, audited Negotiation correction. An existing Case's identity must not diverge through an independent write.

## Approved Future Field Model

| Field | Type/concept | Required? | Purpose | Canonical/reference/snapshot |
|---|---|---|---|---|
| `id` | Text UUID | Yes | Stable commercial workspace | Canonical |
| `tenantId` | UUID Tenant key | Yes | Organizational boundary | Reference; implemented server resolver |
| `storeId` | UUID Store key | Conditional | Explicit operational scope | Reference; same Tenant and contextual StoreAccess |
| `customerId` | Text Customer key | REQUIRED | Persistent commercial identity | Reference; confirmed RESOLVED gate |
| `buyerProfileId` | Text BuyerProfile key | OPTIONAL generally; REQUIRED for BuyerProfile/Match origin | Preference context | Same-Tenant reference; confirmed Customer must agree |
| `leadId` | Text legacy Lead key → `trade_ins.id` | OPTIONAL | Demand traceability | Same-Tenant FK; current confirmed Customer must agree |
| `matchId` | Text Match key | OPTIONAL generally; REQUIRED for Match origin | Original opportunity evidence | Reference, immutable; canonical intelligence stays on Match |
| `tenantVehicleId` | TenantVehicle key | Conditional | Selected actionable vehicle | Reference; audited changes |
| `responsibleMembershipId` | UUID Membership key | Yes | Commercial responsibility | Reference; same-Tenant eligible assignee |
| `createdByUserId` / `createdByMembershipId` | UUID Auth / Membership keys | Human origin | Who initiated | Immutable actor references; distinct from responsible seller |
| `startedByKind` / `systemActorRef` | Human/system; authorized system reference | Kind required; system ref conditional | Future system initiation | Provenance, not grant |
| `originKind` / `sourceChannel` | Bounded origin plus channel | Origin required; channel optional/unknown | Actual source | Immutable provenance |
| `stage` | Small commercial progression code | Yes | Operational position | Negotiation-owned |
| `lifecycle` | Active / formalized / closed concept | Yes | Participation and terminal state | Negotiation-owned; Case completion projected |
| `closureReason` | Operational reason code | Pre-Case closure only | Lost/cancelled/expired/no-fit etc. | Negotiation-owned; no sale outcome |
| `createdAt` / `updatedAt` | Timezone-aware timestamp | Yes | Creation/change audit | Canonical |
| `formalizedAt` | Timezone-aware timestamp | On successful handoff | Negotiation formalization | Canonical event timestamp |
| `closedAt` | Timezone-aware timestamp | On lifecycle closure | Operational closure time | Canonical; Case-driven closure references Case |
| `initiationSnapshot` | Versioned structured context | Available Match context on Match start | Evidence actually presented at creation | Immutable historical snapshot |
| `automationContext` | Optional mode/run/handoff context | Future automation only | Minimal extension point | Logical provenance; inactive in Core |

Do not persist `caseId` on Negotiation: derive it from the single Case FK. No live Match score/confidence, customer contact master data, global vehicle specification, final sale outcome, flattened notes history or duplicated next-action truth belongs on this row.

## Referenced vs Snapshotted Data

Reference Lead, Customer/BuyerProfile, Match, TenantVehicle and seller Membership. Those references retain canonical ownership. Match remains the intelligence source for score, confidence when available, reasons, explainability, provenance, freshness and coverage; a Negotiation snapshot cannot replace it.

One immutable, versioned initiation snapshot preserves what was actually available/shown at start:

| Snapshot component | Justification / limit |
|---|---|
| Match score and ordered reasons / selected explanation | Historical evidence may change after recalculation; never a new live score |
| Available coverage and provenance summary | Distinguish meaningful, neutral, missing and inferred inputs observed at start |
| Confidence / temperature | Only if supplied by a named source with version/time; absence stays unknown, never fabricated |
| Offered price, currency/unit and margin context | Preserve commercial numbers seen by seller; later prices remain vehicle-owned |
| Source/evaluation IDs, evaluatedAt if known, capturedAt, model version if known | Distinguish evidence age from snapshot capture time |

The snapshot records availability states, not silent zero/false defaults. Only capture bounded relevant evidence, not entire mutable records or unnecessary PII. If structured Match evidence was not persisted, label a fresh evaluation separately; do not claim reconstruction of the original detection. Source/channel is already immutable origin metadata, not duplicated again as another editable source.

## Commercial Stage Model

Separate stage from lifecycle and reason. Illustrative minimal stages: contact, qualification, negotiation, ready_for_formalization. Exact enum spelling/values are intentionally deferred to AP-CRM-004's implementation contract; this does not reopen their approved separation or change legacy statuses.

Stage answers where commercial work is. `case_created`, lost, cancelled and won are not stages. Case proposals/revisions are formal workflow, not an independently maintained Negotiation proposal status. Once formalized, retain the last commercial stage for history; continued relationship activities do not create a second checkout state machine.

## Lifecycle Model

- `active`: pre-Case commercial work can progress.
- `formalized`: linked Case exists; Negociação remains available for history, conversations and commercial follow-up.
- `closed`: before Case, requires an operational closure reason; after Case, reflects canonical Case completion without its own final transaction outcome.

Lost/cancelled/expired/no-fit belong in pre-Case closure reason, not stage. Do not expose an independent Negotiation `won` after Case. Archive, if later needed, is a visibility/retention concern, not another transaction outcome; omit it from the initial row.

`formalizedAt` records successful explicit handoff, atomically with Case linkage. Case `createdAt` remains the Case record's timestamp; no additional competing `caseCreatedAt` field is needed. Neither timestamp proves proposal acceptance, payment or delivery. Never independently close a formalized transaction as lost/cancelled outside Case's canonical outcome path.

## Operational Child Records

Anchor future normalized records through Negotiation FK:

- Events: immutable creation, source, assignment, stage, selection, handoff and closure timeline.
- Notes: distinct authored notes; revisions auditable, no concatenated master string.
- Communications: channel, direction, actor, timestamp and external message reference where available; no automatic sending authorized.
- Tasks: owner Membership, action, due time, status and completion; follow-ups are task types. Derive next action from open tasks rather than duplicate mutable summary fields.
- Document requests: commercial request and progress, separate from final Case documentation.
- Objections, commercial approvals and exceptions: bounded typed records; detailed workflows deferred.

Reuse event envelope and task concepts from opportunity events / Case tasks, not their existing FK ownership. `opportunity_events` belongs to `trade_ins`; `case_tasks` and `vehicle_lifecycle_events` belong to Case. None can be silently reparented or treated as Negotiation-owned. Physical child-table schemas and bounded workflows belong to separately authorized implementation slices. Child actor/task references require same-Tenant Membership integrity.

## Case Handoff

Approve future `commercial_cases.negotiationId` / **Case.negotiationId** as the sole persisted relationship, unique when set. Do not add redundant **Negotiation.caseId**. A new canonical sale Case requires this FK; pre-existing legacy Cases can remain nullable during explicit reconciliation. Negotiation has zero or one Case; proposal revisions remain inside that Case instead of creating additional checkout records.

This approved cardinality expresses one workspace → one formal checkout; the current schema does not enforce it yet. Any future multiple-transaction requirement would need a separate reviewed extension.

Formalization atomically validates actor/access, same-tenant customer and TenantVehicle, creates or returns the linked Case, records the handoff event, and sets lifecycle/formalizedAt. Retried actions return the existing Case. Failed creation leaves no formalized marker. Case remains owner of proposals, financing, final documentation, contracts, payments, delivery and final transaction outcome.

CURRENT GAP: Case proposal creation requires a Case-linked Match and vehicle. Canonical manual Negotiation cannot fabricate Match; a future bounded Case contract adaptation must allow the approved manual origin while preserving optional Match traceability.

## Duplicate Prevention

| Rule | Required future enforcement | Limit |
|---|---|---|
| Same Tenant + originating Match, one equivalent open commercial context | Database-backed uniqueness/idempotency plus transactional service handling | AP-CRM-004/AP-CRM-005 finalize physical guarantees; historical closed records allowed |
| Repeated creation request | Idempotency key scoped to Tenant/action, service transaction and database uniqueness | Mechanism belongs in command/creation records, not ad hoc UI check |
| One Negotiation → one Case | Unique Case negotiation FK | Revisions do not create another Case |
| Buyer + TenantVehicle + Tenant already in open context | Application detection using resolved customer identity; explicit reuse/review | Not a blanket unique constraint; legitimate distinct demands may coexist |
| Manual duplicates without vehicle | Application review using resolved identity, demand and origin | Names/phones/emails alone are not a safe uniqueness key |
| Reactivation after closure | Explicit policy and auditable predecessor relationship, retaining history | No silent reopen or accidental uniqueness policy; operation policy defined before enabling reactivation |

Formalized contexts still count as open for duplicate detection until Case termination. Historical Match may originate multiple sequential Negotiations only through explicit reactivation policy, never simultaneous silent duplicates. Per-vehicle global exclusivity/reservation is outside this design; different buyers are not automatically duplicate negotiations.

## Automation Extension Points

The approved Core target supports human initiation only; it is not implemented here. Reserve an optional provenance envelope for mode (Off/Assist/Autopilot concept), authorized system initiator, logical automation run reference, and human handoff timestamp. Do not create a run table or pretend a logical reference is an existing FK.

For future automated origin, Match and authorized automation provenance are required; policy gate supplies authorization independently of stored metadata. Responsible Membership must still be valid. Whether initial responsibility is a seller or a reviewed routing arrangement must be resolved in AP-AUTO before automated writes. Core never depends on automation presence.

Handoff is an audited event; a first human-handoff timestamp may be derived/materialized within the envelope with a defined event source, not treated as proof of consent. Unknown remains distinct from false.

## Auditability

From first implementation, persist creation origin/initiator, responsible Membership, source Lead/Match, creation time and initiation snapshot. Append events for assignment changes, vehicle selection, stage changes, closure reason/time, formalization/Case link, and any future automation initiation/handoff.

Audit events carry stable actor identity, context, timestamp and relevant before/after references. Use membership-aware identities rather than email as the audit ownership key. Historical identities remain attributable after revocation, while all new actions require current authorization. Do not cascade-delete commercial history when source records are retired; exact retention/privacy policy requires its own review.

## Freshness / Provenance Rules

Match/source evidence stays canonical for intelligence. Negotiation snapshot is immutable context at initiation, not independent calibration, scoring or provenance ownership.

Preserve evaluatedAt when known, capture time, source reference, version and explicit/inferred/missing/unknown distinctions. Capture time must not masquerade as evaluation freshness. No confidence percentage, reweighting or ranking change follows from this design.

## Legacy Coexistence Strategy

1. CURRENT: legacy opportunity operations continue reading/writing `trade_ins` and `opportunity_events`; Case and proposal behavior stays unchanged. No canonical wiring is claimed from legacy store/partner identifiers.
2. COMPLETED FOUNDATION: use implemented Tenant runtime, same-Tenant Customer/Profile/Lead bridges and explicit audited confirmation. Tenant/identity normalization prerequisites are satisfied. Per-record fixture identity can still be unresolved; that correctly blocks that record's creation rather than approval of this design. TenantVehicle mapping remains a specific actionable-Match/Case gate; manual qualification may have no vehicle. Missing required mappings never invite fallback to global authorization.
3. TRANSITIONAL: add dedicated persistence and bounded read adapters. Maintain an explicit mapping between a legacy commercial workspace and canonical Negotiation when migrated; retain original demand/trade-in input and event lineage separately.
4. For each opted-in migrated workspace, Negotiation becomes the sole writer for commercial stage, notes, contacts and tasks. Legacy views may project it through an adapter; do not independently dual-write commercial truth. Unmigrated workspaces remain legacy-owned temporarily.
5. New approved Match/manual flows write canonical Negotiation only. `/oportunidades` can retain its route/API compatibility while a read adapter presents Negociação. Migration selection and write routing are explicit, not inferred from names.
6. `/propostas` becomes a compatibility read of Negotiation readiness and Case proposals in a later slice; candidate status is not a formal proposal record. Case keeps checkout responsibility.
7. Reconcile Case commercial tasks/notes without erasing historical events. Move future commercial work ownership through reviewed adapters; keep formal process tasks in Case.
8. Stop old commercial writes for migrated contexts, validate regression and remove competing ownership incrementally. Never silently backfill tenant from email, `store_id`, partner or inventory scope. No big-bang migration or data deletion.

## Satisfied Prerequisites and Remaining Operation Gates

| Evidence | Completed responsibility |
|---|---|
| AP-CRM-003A | Approved Tenant baseline restored; Tenant Model V1 remains normative |
| AP-CRM-003B | Selected existing Customer as preferred identity candidate requiring normalization; no replacement party model |
| AP-CRM-003C | Defined Customer/Lead/Profile cardinalities, confirmed-link semantics and creation-resolution gate |
| AP-CRM-003D1D (`8d2a7a1`, `df504cc`) | Tenant Core, Customers/BuyerProfiles/Leads/Cases ownership, server-side resolver, persisted public intake routing, Case integrity and Preview/runtime validation |
| AP-CRM-003D (`e73f1a2`) | Nullable same-Tenant Profile FK; one-current-Lead mapping; append-only provenance/corrections; RESOLVED/UNRESOLVED/CONFLICT; Match FK reconciliation/coherence; focused tests, build and rollback-only staging validation |

AP-CRM-003D applied staging migrations 0026/0027 without speculative identity backfill. All 52 profiles and 53 Leads remain unresolved until explicit confirmation; business-row hashes are unchanged. This is correct fixture handling, not an outstanding architectural identity decision. Completed prerequisites do not imply broad legacy RLS conversion, canonical TenantVehicle persistence or a deployed Negotiation flow.

## Implementation Risks

- Future Negotiation commands must use the implemented Tenant/Membership resolver and operation-specific capabilities, rather than legacy/global permission shortcuts.
- Existing fixture and intake records need explicit confirmation when selected; the implemented resolver must be protected through the future creation transaction.
- Legacy Match source may not yet identify actionable TenantVehicle.
- Global admin checks cannot authorize canonical tenant operations.
- Concurrent creation/formalization needs database-backed integrity and idempotency, not only application checks.
- Case overlaps and mandatory Match proposal path need staged compatibility changes.
- Snapshot availability may differ from historical evidence; never label a recomputation as original evidence.

## Bounded Details Deferred to AP-CRM-004 and Later Command Slices

Customer authority, identity-resolution prerequisites, transitional Lead target/mapping and single-Case cardinality are settled. Implementation must specify small stage/closure-reason enum values; responsible-seller eligibility and Store-required action matrix; reactivation/review policy before that action is enabled; versioned bounded snapshot format and retention handling; exact FK/partial-uniqueness/idempotency syntax; and explicit legacy adapter/write routing. TenantVehicle source mapping must be established before actionable Match creation or vehicle-sale formalization. No omission permits guessing identity, authorizing through legacy Store fields, inventing vehicle ownership or creating duplicate canonical writers.

These refine implementation, not approved domain boundaries. Tenant, Membership, StoreAccess, dedicated Negotiation, required resolved Customer, manual creation, explicit formalization and Case outcome ownership remain fixed. AP-CRM-003 is approved; AP-CRM-004 requires its own bounded task authorization.

## Recommended Implementation Slices

1. AP-CRM-004: implement the approved Negotiation schema/migration contract, matching existing physical identity keys and specifying operation policy, enum values, snapshot version and database integrity/idempotency details. Identity/Tenant foundations are reused; actionable TenantVehicle mapping is a gate for the corresponding commands, not a legacy alias.
   AP-CRM-004V follows the minimum root persistence slice and establishes canonical TenantVehicle persistence before AP-CRM-005. This prerequisite is documented separately and is not started automatically.
2. Validate the root/children's same-Tenant constraints with positive, cross-Tenant and concurrency tests before any separately authorized rollout. No implementation is performed by this document.
3. Add normalized creation/audit/task primitives and a pure repository/service contract with offline tests.
4. Implement explicit Match → Negotiation creation with bounded snapshots and idempotency.
5. Implement manual creation with explicit customer resolution and optional vehicle selection.
6. Build workspace read model over canonical children and stable legacy-compatible boundaries.
7. Implement idempotent Negotiation → Case handoff and reconcile manual-origin proposal dependency.
8. Add explicit legacy workspace adapter/write routing; reconcile Case commercial overlap and outcome projections.
9. Run tenant/store negative tests and end-to-end regression before approved rollout.

The current finalization task explicitly sets AP-CRM-004 as the next schema/migration implementation slice; the earlier AP-CRM-002 agenda label is historical planning, not permission to start it automatically. Each implementation slice needs separate authorization.

## Explicit Non-Goals of This Finalization

No Negotiation root/child schema, migration, service, API, workspace or handoff is implemented; no `negotiations` table is created. No vehicle redesign, Customer deduplication, Lead replacement, `/clientes` redesign, Case semantic change, Match scoring change, broad RLS hardening, automation, fixture backfill, deployment or database write occurs. AP-CRM-004 is not started.

## Finalization Validation

The complete document was reconciled with Tenant Model V1, AP-CRM-003B/C conclusions, AP-CRM-003D implementation/checkpoint, and the current Case/Match reference contracts. Obsolete missing-Tenant/missing-identity assumptions were removed. Per-record unresolved identity and unimplemented TenantVehicle mapping remain explicit operation gates. Only this design document changes; validate its complete diff, `git diff --check` and repository status before the documentation checkpoint. A build is unnecessary for this documentation-only slice.
