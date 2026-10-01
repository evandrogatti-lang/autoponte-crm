# AP-CRM-002 — Canonical CRM Flow Decision

## Status

APPROVED DOMAIN BASELINE

This document records the approved domain decisions. It does not implement or approve a final database schema, migration, API change, UI change, or automation implementation.

- Repository: `C:\AutoPonteDev\autoponte_work`
- Branch: `fix/crm-runtime-integration`
- Baseline HEAD: `e750c48fac9ae4fd4f755ea948dba50d058c4c5a`
- Runtime checkpoint: [AP-CRM-001-CHECKPOINT](AP-CRM-001-CHECKPOINT.md)

## Date

2026-10-01

## Canonical Flow

```text
Lead → Match → Negociação → Case / Checkout → Outcome
```

This describes domain relationships, not compulsory creation of every entity. Lead may exist without Match; Negociação may originate manually without Match. Neither Match detection nor progression alone silently creates operational records.

## Entity Definitions

### Lead

Lead represents customer demand / interest. It is distinct from Match, Negociação, and Case. It preserves the original demand even when all Matches are rejected, expire, or are lost.

Typical sources include website, WhatsApp, phone, showroom / walk-in, marketplace, referral, seller manual entry, and reactivation. These examples do not define an implemented source enumeration.

### Match

Match represents a system-detected Buyer ↔ Vehicle opportunity. Where applicable, it owns compatibility and opportunity-detection intelligence: score, confidence, temperature inputs, position, margin potential, reasons, explainability, provenance, freshness, coverage, and uncertainty.

These domain responsibilities do not imply that every capability is currently implemented or persisted. They do not authorize confidence-based scoring or changes to existing Match behavior.

Match is not a commercial negotiation. It can exist without Negociação and remains traceable after Negociação or Case creation. It must not own seller activity, communications, notes, follow-up, next actions, commercial stages, formal proposals, contracts, payments, or delivery.

### Negociação

Negociação is the canonical persistent commercial workspace. The current product concept “Oportunidade” should evolve toward Negociação; this slice does not rename code or routes.

Negociação owns the responsible seller, customer / buyer context, selected vehicle reference, originating Match when applicable, commercial stage, contacts, communications, seller notes, next actions, follow-up, document requests, commercial approvals, exceptions, objections, and operational commercial history.

Negociação requires its own canonical persistence model. **`trade_ins` is not the canonical Negociação entity.** It may remain a legacy/input structure for demand, trade-in, and compatibility during migration. One commercial process must not remain represented by competing canonical records in legacy trade-in/opportunity structures and Negociação.

### Case

Case is the formal operational checkout of the transaction. “Checkout” is a product/domain analogy; the canonical entity remains Case unless a future explicit naming decision changes it.

Negociação is where the deal is worked. Case is where the transaction is formalized and completed. Case owns formal proposals and revisions, formal approvals tied to completion, final documentation, financing / approval process, contract, payment, delivery, official completion, and final transaction outcome.

Case remains traceable to Negociação, customer, vehicle, seller, and originating Match and Lead when applicable. It must not become a second competing CRM workspace.

### Outcome

Before Case creation, Negociação may terminate operationally through outcomes such as lost, cancelled, expired, no-fit, or customer inactive. These examples do not decide an enum.

After Case creation, Case is the canonical owner of the final transaction outcome. Negociação may reflect formalization or closure, but must not maintain an independently competing final sale outcome. Match may record its own lifecycle/result without replacing the transaction outcome.

Independent truths such as “Negociação won / Case lost / Match completed” must not govern the same transaction without an explicit source-of-truth relationship.

## Canonical Invariants

- Demand, detected compatibility, commercial work, and formal checkout are distinct responsibilities.
- Lead can survive independently of Matches and their disposition.
- A Match's existence does not create a Negociação.
- Core creation of Negociação requires explicit human commercial action; future automated creation requires policy authorization and an authorized commercial action.
- Negociação has one canonical persistence model and owns commercial stage.
- Manual Negociação is allowed; no fabricated Match is required.
- Case starts only through explicit formalization of Negociação.
- Negociação survives Case creation as the commercial-history workspace.
- Final transaction outcome belongs to Case once Case exists.
- One commercial process must not silently create duplicate active Negociações.
- Advancement does not delete historical records or source relationships.
- Unknown remains distinct from false; preferences and inferred information do not silently become hard constraints.

## Match → Negociação

### Core

```text
Match → “Iniciar negociação” → Negociação created → workspace opens
```

This explicit human action is the first implementation target. Negociação preserves the originating Match reference when applicable. Match continues to own its evaluation evidence; Negociação owns subsequent commercial work. Match generation alone must not create Negociação.

The detailed idempotency/duplicate constraint and persistence fields remain deferred; the approved invariant is that one commercial process does not silently generate duplicate active workspaces.

### Automation Add-on

```text
Match → Automation Gate → authorized commercial action
      → Negociação → automated qualification → human handoff
```

A qualified Match may initiate Negociação through a future optional add-on only under explicit tenant automation policy and an authorized commercial action. It never silently becomes Negociação merely because it exists. The automation engine is outside the current CRM Core implementation phase.

## Manual Negociação

Negociação may be created without Match for walk-in customers, direct WhatsApp contact, phone inquiries, seller-created opportunities, existing customers, or manually identified vehicle interest.

Preserve the actual origin and initiator. Do not fabricate a Match to satisfy the model. Final source fields and enumeration are not defined here.

## Negociação → Case / Checkout

```text
Negociação → explicit formalization action → Case created
           → formal transaction workflow begins
```

The boundary is explicit formalization, not Match detection or an automatic commercial-stage change. Conceptual actions include “Criar proposta formal” or “Formalizar venda”; exact UI wording is deferred.

Creating Case does not erase Negociação. Commercial context, seller notes, conversations, objections, relationship history, and commercial follow-up remain owned by Negociação. Case owns final documentation and the formal transaction process. Commercial document requests and formal document completion must retain this distinction.

Existing Case contacts, follow-up, notes, and `active_negotiation` are implementation overlaps to reconcile later, not authority to reopen this approved ownership boundary.

## Ownership Matrix

| Concept | Canonical owner | Secondary references / boundary |
|---|---|---|
| Customer demand / interest | Lead | Negociação and Match reference demand |
| Buyer profile | Buyer/Profile domain | Lead, Match, Negociação and Case reference buyer context |
| Match score | Match | Consumers read evaluation |
| Match confidence | Match | No calibrated confidence or scoring change authorized here |
| Match reasons / explainability | Match | Negociação may display evidence |
| Source provenance / freshness facts | Source evidence | Match references evidence and owns its evaluation provenance |
| Opportunity detection | Match | Explicit handoff to Negociação |
| Responsible seller for commercial work | Negociação | Case retains seller traceability |
| Vehicle master data | Vehicle domain | Match, Negociação and Case reference the vehicle |
| Selected vehicle for commercial work | Negociação | Case retains transaction vehicle reference |
| Commercial stage | Negociação | Other consumers use its canonical state |
| Contacts / communications | Negociação | Case may reference commercial history |
| Seller notes | Negociação | No competing editable commercial history in Case |
| Next actions / commercial follow-up | Negociação | Case may have distinct formal-process tasks |
| Commercial objections | Negociação | Case may reference context |
| Commercial approvals / exceptions | Negociação | Distinct from formal completion approvals |
| Commercial document requests | Negociação | Case owns final transaction documentation |
| Formal proposal / revisions | Case | Negociação references formalization |
| Final documentation | Case | Negociação retains request/conversation history |
| Formal approvals / financing | Case | Transaction completion responsibility |
| Contract | Case | References formal proposal |
| Payment | Case | Formal reconciliation |
| Delivery / official completion | Case | Vehicle state may reflect completion |
| Operational termination before Case | Negociação | Exact lifecycle enum deferred |
| Final transaction outcome after Case creation | Case | Negociação reflects canonical outcome; Match retains its own lifecycle |

Secondary references do not create a second source of truth. Source evidence owns underlying facts; Match owns their interpretation for its evaluation.

## Lifecycle Rules

- Lead may have zero or multiple Matches and retains demand independently.
- Match may exist without Negociação.
- Rejected Match does not create Negociação.
- Expired/stale Match does not create Negociação automatically.
- Match remains historically traceable after handoff and transaction completion.
- Core handoff requires explicit human action.
- Future automated initiation requires the policy-controlled Automation Gate and authorized commercial action.
- Negociação may exist without Match and preserves its actual manual origin.
- One commercial process must not silently create duplicate active Negociações; exact database enforcement is deferred.
- Case starts only after explicit formalization of Negociação.
- Negociação remains available after Case creation.
- Before Case, operational termination belongs to Negociação; after Case, final sale transaction outcome belongs to Case.
- History is retained as the process advances; no deletion is implied by conversion or closure.

## Automation Add-on Boundary

Automated commercial engagement is a future optional add-on separate from CRM Core. Conceptual modes are Off, Assist, and Autopilot. Core does not depend on the add-on.

Future persistence should be capable of representing source type, originating Match, human/system initiator, automation mode, automation run reference, and human handoff timestamp. These are conceptual requirements, not final schema fields.

Future automated interaction requires an explicit policy gate. Where applicable, gate inputs include confidence, hard constraints, provenance, freshness, consent, available communication channel, vehicle availability, duplicate active negotiation detection, tenant automation configuration, and contact-frequency rules.

Unknown must remain distinct from false. Preferences or inferred information must not silently become hard constraints. No automation, automation tables, or final automation schema are implemented or authorized by this document.

## Current Repository Conflicts

The preceding bounded inspection confirmed these migration concerns:

1. `app/leads/page.tsx` and `app/oportunidades/page.tsx` read the same `trade_ins` records.
2. `db/schema.ts` and `lib/opportunities/{types,domain,service}.ts` combine demand/trade-in data with legacy commercial stages, contacts, notes, next actions and events.
3. No explicit persisted canonical Negociação entity currently exists in the inspected model.
4. `lib/match-engine.ts` persists Match candidates but does not implement canonical Match → Negociação handoff.
5. `lib/commercial-cases/contracts.ts`, `lib/commercial-cases/service.ts` and `db/pilot-schema.ts` include Case contact/follow-up tasks and notes that overlap Negociação ownership.
6. Cases include `active_negotiation`, creating commercial-stage ownership ambiguity.
7. `app/propostas/page.tsx` exposes candidates derived from `trade_ins`; formal `proposals` records belong to Cases.
8. Closing/outcome concepts occur in `trade_ins.status`, `commercial_cases.finalOutcome`, and Match completion/outcome behavior.
9. `proposal.create` currently requires an existing Case and a Match linked to that Case/vehicle. Future formalization must reconcile this dependency with approved manual Negociação without fabricating a Match.

These are current implementation conflicts, not changes performed by this slice. Existing behavior remains intact until explicitly migrated.

## Migration Principles

- Migrate incrementally; no big-bang rewrite.
- Preserve existing API contracts until explicitly migrated.
- Preserve tenant isolation and existing access boundaries.
- Preserve existing data and historical relationships.
- Do not reinterpret unknown as false.
- Legacy structures may coexist temporarily under explicit compatibility rules, but must not remain competing canonical sources indefinitely.
- Keep `trade_ins` as a legacy/input structure where needed; do not promote it to canonical Negociação.
- Reconcile Case commercial-work overlaps and manual-flow dependencies in approved future slices.
- No application, schema, migration, API, UI, database, RLS, deployment, or environment change is authorized by this documentation slice.

## Planned Implementation Sequence

CRM Core agenda:

1. AP-CRM-003 — Negotiation persistence design
2. AP-CRM-004 — Oportunidade → Negociação product/UX alignment
3. AP-CRM-005 — Match → Start Negotiation handoff
4. AP-CRM-006 — Negotiation operational workspace
5. AP-CRM-007 — Negotiation → Case formalization
6. AP-CRM-008 — Case as transaction checkout
7. AP-CRM-009 — Ownership/outcome consolidation
8. AP-CRM-010 — Mission Control alignment
9. AP-CRM-011 — End-to-end CRM regression validation

Future optional add-on track:

1. AP-AUTO-001 — Automation add-on contract
2. AP-AUTO-002 — Automation Gate
3. AP-AUTO-003 — Off / Assist / Autopilot policy
4. AP-AUTO-004 — Automated initial engagement
5. AP-AUTO-005 — Automated qualification/data collection
6. AP-AUTO-006 — Temperature/confidence feedback loop
7. AP-AUTO-007 — Human handoff
8. AP-AUTO-008 — Automation metrics/management
9. AP-AUTO-009 — Commercial packaging

No AP-AUTO slice is implemented now. Each future implementation requires its own approved, bounded Task Contract.

## Explicitly Deferred Decisions

- Exact Negociação database schema and reference/snapshot fields.
- Exact commercial-stage and pre-Case terminal-state enums.
- Exact automation schema and final source enumeration.
- Exact UI wording for Case formalization.
- Exact duplicate-prevention database constraint and idempotency mechanism.
- Exact migration path and compatibility mapping from legacy `trade_ins`.

The canonical entity boundaries, dedicated Negociação persistence, manual creation, explicit formalization, outcome ownership, and optional automation boundary are approved and are not reopened here.
