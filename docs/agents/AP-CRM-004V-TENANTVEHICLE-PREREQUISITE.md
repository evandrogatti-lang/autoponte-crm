# AP-CRM-004V — TenantVehicle Canonical Persistence

Status: PREREQUISITE DEFINED — NOT STARTED

Created following the approved AP-CRM-004 vehicle decision. This document defines the separate slice; it does not authorize or begin implementation.

## Purpose and dependency

Establish the canonical tenant-scoped commercial vehicle identity required by actionable Match-originated Negotiation. **AP-CRM-005 must not begin until AP-CRM-004V is complete.** The AP-CRM-004 root permits manual qualification without a vehicle.

Canonical Negotiation vehicle reference:
**DEFERRED until TenantVehicle persistence exists.**

## Bounded work for a separately authorized slice

- Review Tenant Model V1, the approved Negotiation design, current hybrid vehicle/source contracts and AP-CRM-004 implementation before editing.
- Establish canonical TenantVehicle persistence with explicit Tenant ownership and same-Tenant integrity. VehicleSpecification remains the global technical specification.
- Define how a reviewed existing Match source resolves to an actual TenantVehicle and validate its Tenant. Do not treat the current legacy `vehicles` table, source ID, text label, plate, partner or inventory scope as a substitute for canonical identity.
- Define the canonical Negotiation FK only after the target exists, preserving nullable vehicle during manual qualification. Actionable Match origin must resolve a same-Tenant TenantVehicle before creation is enabled.
- Specify safe migration/preflight, no inferred ownership or blind backfill, minimum persistence primitives, tenant-negative tests and source-resolution evidence. Stop for a decision on contradictions or destructive migration requirements.

## Completion evidence

Canonical schema/key/FK, server-side Tenant validation, explicit source-resolution contract, safe staging migration evidence and passing focused/build/type/lint checks. Preserve existing Tenant, identity, Negotiation, Match and Case responsibility boundaries.

No Negotiation workspace, Match start action, Case formalization, scoring change, automation or broad legacy conversion belongs in this prerequisite. AP-CRM-005 remains separately authorized work after completion; it does not start automatically.
