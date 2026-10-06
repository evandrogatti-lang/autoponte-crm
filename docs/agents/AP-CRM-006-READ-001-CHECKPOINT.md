# AP-CRM-006-READ-001 — Canonical Negotiation Workspace Read Checkpoint

Date: 2026-10-06 Europe/Berlin.
Task: AP-CRM-006-READ-001. Review: AP-CRM-006-READ-001R.
Result: PASS — READY_FOR_CHECKPOINT_AND_COMMIT.
Preservation authorization: AP-CRM-006-READ-001C, supplied by the user.
Branch: `fix/crm-runtime-integration`.
Reviewed and pre-checkpoint HEAD: `56e621afec29c0170e102c514e222f1299cee50b`.
Governance: [AP-GOV-002 reconciliation](AP-GOV-002-DECISION.md), adopting canonical Operating Model V1 at Governance commit `ee87448cc0713fb6ca006a9b07445d40e6169b9b`.

## Preserved result

`readNegotiationWorkspace` provides a canonical authenticated Negotiation Workspace read boundary requiring an explicit, nonempty Negotiation ID. Authenticated Tenant/Membership/RoleAssignment authority governs access; requested Tenant is only a validated selector. Foreign and missing IDs share non-enumerating `null` semantics.

The projection uses canonical Negotiation truth and reference IDs only, with no legacy `trade_ins` commercial promotion or inferred mapping. Nine operational sections remain explicitly `UNRESOLVED` with reason `CANONICAL_PERSISTENCE_NOT_ESTABLISHED`. Nullable canonical references remain nullable.

The added boundary reads and projects the root without operational writes. No UI/API wiring, schema/database changes, child-table persistence, Match redesign or Case handoff was introduced. Tenant-level reading grants no future write or Store-scoped capability.

## Review validation evidence

AP-CRM-006-READ-001R found no BLOCKER or MATERIAL issue. Recorded review gates:

- PASS: `node --test tests/negotiation.test.mjs tests/tenant-context.test.mjs tests/tenant-runtime.test.mjs` — 22/22.
- PASS: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- PASS: changed-file ESLint for `lib/negotiation/contracts.ts`, `lib/negotiation/service.ts` and `tests/negotiation.test.mjs`.
- PASS: `git diff --check`.

Tests use mocked persistence; live database behavior was not revalidated. Production build was not required by the review. This checkpoint/commit task preserves the reviewed implementation unchanged rather than rerunning implementation validation.

## Preservation and commit boundary

Pre-write checks confirmed expected branch/HEAD, empty index, exactly five modified files, no untracked files and all five SHA-256 hashes matching the supplied reviewed state.

Only the three backend files above and this checkpoint are authorized for staging and commit. Protected AP-CRM-006B.1R Workspace TSX/CSS remain paused, unchanged and unstaged, outside this checkpoint's implementation scope. Operational Memory remains unchanged: inspected conventions do not require immediate update after every committed slice.

Commit only after reviewing the exact four-file staged diff, passing `git diff --cached --check` and reconfirming reviewed hashes. Message: `feat(crm): add canonical negotiation workspace read`. Resulting commit/HEAD and post-commit preservation evidence are reported separately. No push or merge.

## Next boundary

Canonical Negotiation read → Opportunity Workspace integration is the next candidate for commercial progress. Execution requires a separately approved bounded contract, resolution of the paused UX governing authorization, and an explicit canonical Negotiation-ID entry path; legacy Opportunity IDs cannot be inferred into Negotiation IDs. This checkpoint authorizes no integration or resumption. Technical read-boundary completion is distinct from future commercial-result evaluation.
