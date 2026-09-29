# AutoPonte Slice Execution Rules

This document defines the stable execution rules for implementation slices in AutoPonte.

## 1. Core principle

Work in small, testable, reversible slices.

Each slice must solve a concrete AutoPonte need and must have:

- one primary objective;
- explicit scope;
- known constraints;
- validation criteria;
- stop conditions;
- a checkpoint before the next slice.

Do not broaden a slice merely because adjacent improvements are visible.

## 2. Official stack

Preserve the current stack:

- Next.js 16.x
- TypeScript
- Drizzle ORM
- Supabase / PostgreSQL
- Vercel

Replacing a structural component requires an explicit architectural decision outside the implementation slice.

## 3. Domain boundaries

Preserve the established separation between:

- Lead / Funil
- Match
- Negociação
- Cases

Do not rename, merge, or redistribute these responsibilities without explicit domain review.

Negociação is an operational workspace.

Match represents system-generated opportunity capability.

## 4. Multi-tenant boundaries

Tenant represents the company.

Tenant-scoped data must remain isolated by tenant.

Preserve:

- membership-based access;
- roles: owner / manager / seller;
- StoreAccess rules.

Never trust a client-provided `tenantId` when it can be resolved server-side.

## 5. Data and intelligent systems

For Match, recommendations, Business Temperature, Opportunity DNA, ADE, and related systems:

- preserve provenance when applicable;
- preserve confidence when applicable;
- preserve freshness when applicable;
- provide explainability where decisions require it;
- keep `unknown` distinct from `false`, missing data, and inferred values.

Critical facts used as hard constraints require auditable provenance and known freshness.

Preferences, history, or inference must not silently become hard constraints.

## 6. Contracts and persistence

Outside the explicit slice scope, preserve:

- API routes;
- JSON contracts;
- HTTP status behavior;
- authentication behavior;
- persistent data;
- database schema;
- migrations;
- RLS and constraints.

Database or persistent-data changes require impact review before execution.

Destructive or irreversible database operations require explicit authorization.

## 7. Implementation discipline

Before relevant changes:

1. verify branch;
2. verify `git status`;
3. inspect only the files directly related to the slice.

Expand exploration only when a concrete dependency requires it.

Do not perform opportunistic refactors.

Do not replace missing environment credentials with credentials from another environment.

Treat Production and staging/teste2 as distinct environments.

## 8. Agent behavior

The Agent executes the bounded job prepared for the slice.

It must not:

- redesign the architecture on its own;
- explore the repository broadly without justification;
- repeatedly reread the same files without progress;
- continue when a stop condition has been reached.

When blocked, return evidence and the reason for stopping.

## 9. Definition of done

A slice is not complete merely because the build passes.

Completion requires the validation defined for that slice, relevant regression checks, review of the final diff/status, and documentation of material architectural or domain decisions when applicable.

Commit only after successful review and validation.
