# AP-CRM-006 — Canonical Negotiation Workspace integration checkpoint

Date: 2026-10-22 Europe/Berlin.
Current result: READY_FOR_COMMIT_AND_PUSH — locally validated; new branch Preview runtime validation pending.
Branch: `fix/crm-runtime-integration`.
Pre-commit HEAD: `04bc8eb3421167570760c12cea0626c746d455a3`.
Previous authority/evidence: AP-CRM-006-READ-001 checkpoint and AP-GOV-002 reconciliation.

## Contract and initial state

The user's AP-CRM-006 resume instruction authorizes consolidation of the existing explicit
Negotiation ID -> authenticated canonical route -> readNegotiationWorkspace ->
OpportunityWorkspace canonical presentation. It does not authorize schema/migrations,
database writes, implicit legacy-ID conversion, Demand/Inventory matching, compatible
vehicle lookup, Match initiation UI, Case formalization or unrelated legacy refactoring.
Stop on a new domain contract/schema requirement, unclear access semantics or scope expansion.
No commit or push was authorized or performed.

Initial working tree: modified OpportunityWorkspace.tsx and its CSS; untracked
app/negociacoes/[negotiationId]/page.tsx and negotiation-workspace-integration.test.mjs.
Existing local integration was coherent but only partially validated. Existing paused
AP-CRM-006B.1R disclosures/cockpit styles were preserved, not redesigned or declared approved.

## Consolidated behavior

The existing force-dynamic route keeps the exact canonical ID, authenticates with return_to,
then invokes readNegotiationWorkspace without a client Tenant override. Missing roots and
TenantAccessError produce not-found; infrastructure errors remain errors. The committed
read service retains authenticated Tenant/Membership/RoleAssignment authority.
No fallback to trade_ins, Opportunity IDs or legacy commercial values is introduced.

OpportunityWorkspace selects a separate canonical read-only presentation. Root references,
stage/lifecycle and dates come from the canonical projection. All nine operational sections
retain UNRESOLVED / CANONICAL_PERSISTENCE_NOT_ESTABLISHED; absent references stay absent.
The explicit link to the legacy portfolio is navigation only, not a data fallback.

This execution added a canonical-only CSS scope for long IDs/narrow viewports and extended
the existing integration tests for filled references, lifecycle dates, escaped identifiers,
encoded auth return paths and each presentation tab. Route and backend semantics were unchanged.

## Validation

- PASS: `node --test tests/negotiation-workspace-integration.test.mjs tests/negotiation.test.mjs tests/tenant-context.test.mjs tests/tenant-runtime.test.mjs tests/crm-auth.test.mjs` — 33/33, including seven integration tests. Service/route tests use mocked persistence; tab branch tests control React state in the harness.
- PASS: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- PASS with two existing legacy warnings: changed-file ESLint for route, Workspace TSX and integration test. Unused `_` and legacy `<img>` were not changed.
- PASS: `npm run build`; Next.js 16.3.5 lists `/negociacoes/[negotiationId]` as dynamic.
- PASS: `git diff --check`.

The sandbox build stalled during compilation and was interrupted. The network-enabled
build completed successfully. The initial sandbox dev server was inaccessible over loopback;
it was stopped. The successful local runtime uses the production build via next start on
127.0.0.1:3106. These environment limitations were not application test failures.
Next dev automatically appended agent rules to AGENTS.md; only that generated change was
removed, restoring its tracked content. Build artifacts and screenshots are ignored outputs.

## Real local runtime against teste2

Local Auth URL and direct PostgreSQL hostname were checked to reference teste2
`prcmlynykncfgzwluoef`, without printing/copying credentials or changing environment files.
This local direct connection is distinct from the Preview-only homologation Session Pooler guard.

- Unauthenticated GET returned HTTP 307 to login with the exact canonical ID in return_to.
- The user logged in directly through the local browser; no session was copied or bypassed.
- Negotiation `3487214d-e395-4573-bf43-c127bd9fea10` rendered through the real authenticated
  route and committed canonical read service.
- The page showed origin match_manual, stage contact, lifecycle active, responsible Membership
  `6fbc268f-9ccc-4aa9-9cb0-45bb949468dd`, Match `88b49441-cb45-4089-a48d-1fa30310cced`,
  Customer/Profile references and TenantVehicle `2698c9b1-4c40-4e42-90f4-2429d3d43be1`.
  Lead remained not linked; no legacy demand/vehicle details were fabricated.
- All seven tabs were exercised through browser clicks. Summary had nine unresolved sections
  and zero input/textarea/select elements.
- Desktop 1440x900 and mobile 390x844 were visually inspected; document scrollWidth equaled
  viewport width in each. Mobile tabs retain their internal horizontal scroll. Viewport reset afterward.
- Missing canonical ID and legacy ID `phase2-p2-03-opportunity` displayed the 404 page.
  A real foreign-Tenant fixture was not used; that denial is covered offline only.
- Browser log inspection showed an unrelated chrome-extension share-modal error; no application
  error was observed in that capture.
- Local mobile screenshot: `outputs/ap-crm-006/mobile.png` (ignored, not a committed artifact).

No business-data write, migration, SQL mutation, credential substitution or environment edit
was performed. Normal user login/session handling is distinct from business-data persistence.

## Preview gate

Read-only Vercel list_deployments inspection of approved project
`prj_5jiXHFrJuH7jfRp5WlANvmRpoIdU` returned latest READY deployment
`dpl_GbJm2NNFnSMx1xSdEewDZCP4y28c`, URL
https://autoponte-k47xx2nnb-auto-ponte.vercel.app, source base `67b9254` on the approved branch.
That deployment predates the canonical read commit and the local integration; it is not
evidence for this slice. No exact-source Preview was available from that inspection.
No Vercel CLI or existing local CLI authentication was found in the checked standard locations.
No new deployment, installation, push, remote configuration change or Production operation occurred.

Decision needed: provide/deploy a Preview containing the reviewed local integration using an
approved publication path, then validate its authenticated route and environment against teste2.
Do not mark AP-CRM-006 fully PASS solely from the successful local runtime or an older Preview.

## Files and continuation boundary

Consolidated scope: existing route, Workspace TSX/CSS, integration test, and this checkpoint.
This execution changed only the TSX canonical root class, canonical-scoped CSS, tests and checkpoint.
The existing route was preserved. Backend, schema, migrations, legacy APIs and other UX were untouched.

Remaining capabilities: canonical operational persistence/actions, resolved display names/details,
Match initiation UI and Negotiation -> Case are absent or deferred. They are not failures of this
read-only presentation contract and were not started.

Next step: exact-source Preview/teste2 validation of AP-CRM-006, then checkpoint review. No new
matching or operational slice is started. Stop here; no commit/push or further implementation.

## Final Preview/teste2 gate attempt — 2026-10-22

Result: **DECISION REQUIRED — new Preview Auth configuration gate failed.**
This section supersedes the earlier statement that no deployment occurred. Local validation
above remains historical PASS; no full Preview PASS or commit is claimed.

The user's final validation instruction authorized a new non-Production Preview and a commit
only after successful runtime validation. Branch/HEAD and the five-file local scope were
reconfirmed unchanged. Existing AP-CRM-006B.1R UX was neither reverted nor refactored.

### Preflight and publication evidence

- Approved Vercel project/team verified through project lookup and .vercel/repo.json.
- The previously deployed authenticated read-only environment endpoint returned
  REAL_PREVIEW_ENVIRONMENT_GUARD_PASS for Preview, branch fix/crm-runtime-integration,
  Auth and persistence project prcmlynykncfgzwluoef, identitiesAgree=true, batchExecuted=false.
  This establishes the old deployment identity, not environment injection into the new one.
- Environment metadata lists branch-scoped NEXT_PUBLIC_SUPABASE_URL/DATABASE_URL and an
  inherited Preview NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. No decrypted secrets were retrieved,
  copied or changed. Stored metadata alone does not prove a new build receives those variables.
- New Preview: https://autoponte-fxnld2usa-auto-ponte.vercel.app
- Deployment: dpl_ETkJiGLVS93wtBdTxJpuYH6vW5CC, approved project, iad1, READY, target=null
  (Preview). Vercel build logs report Build Completed in /vercel/output [36s].
- Published current application sources/assets using API file references plus inline changed
  sources, not an older Git ref. The payload included base HEAD 04bc8eb, dirty=true and the
  approved branch in gitMetadata. The returned deployment metadata is empty; actual branch
  identity in the new runtime was not independently established because Auth failed first.
- API preparation initially rejected missing file references and then target='preview'. Inline
  changed sources resolved the file references; per Vercel API documentation, omitting target
  selects Preview. No Production target, alias, environment or project setting was changed.
- Application source SHA-1 digests sent: route 3b6f22ddfb08fdcb16a30f261f912e84aca86b06;
  Workspace TSX 90da15e7e69088f8d008dbd0038a820bd91e5151;
  CSS 5a1fe9b447c465918616e9f6f9d0ccfc82711bf8.
  Remote source listing includes app/negociacoes and confirms canonical read-service/contracts
  digests b469404bfe7bce3b343a196d15a3a4820730ac0b /
  6a50342a28c27317bf25170e722d4094de45d470 matching local inputs.

### Failed runtime boundary and stop

The new canonical URL redirected to login with the explicit ID preserved in return_to.
The user attempted normal login and reported the configuration error. Browser inspection
confirmed: "A autenticação ainda não foi configurada neste ambiente."
lib/supabase-auth-client.ts throws exactly this message when NEXT_PUBLIC_SUPABASE_URL or
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is absent. Which variable was missing in the new bundle,
and why branch-scoped configuration did not produce a usable Auth client, remain unverified.
No credential was read from the form and no session was copied or bypassed.

Authenticated canonical rendering, tabs, desktop/mobile and negative-ID checks were therefore
BLOCKED in this Preview. Local PASS evidence is not substituted for these missing gates.
New Preview/teste2 environment identity could not be confirmed by its authenticated guard.
Stopped without environment edits, fallback code, another deployment or a commit, as required
by the user's failure/uncertain-environment stop condition.
Error-only screenshot: outputs/ap-crm-006/preview-auth-error.png (ignored; excludes credential fields).

### Read-only commercial-data verification

Read-only teste2 queries before publication and after the failed gate returned equal row
counts and whole-row ordered hashes for all seven inspected business roots:

| Table | Count before = after | Hash before = after |
| --- | --- | --- |
| buyer_profiles | 53 | 51c256995ad01106eba33b3b5afe8ac1 |
| commercial_cases | 51 | 5dcaaa88efbfdb49b919e023cbf68244 |
| customers | 52 | 42ee9b83332065f48a9e4fb80b4efe3c |
| negotiations | 1 | 6d873fafe130c441c9c4d40ecf7d71be |
| tenant_vehicles | 6 | cd0511a7bc64b8724d9a931c56a0ac1d |
| trade_ins | 54 | 67bc61b0f9046939d854a04c5be01c41 |
| vehicle_matches | 254 | 72d362c5d722fb8b527819c1fa3bd1b5 |

Expression: md5(string_agg(row_to_json(t)::text,'' order by id)). No business write command,
migration or mutation endpoint was invoked. These hashes establish unchanged final content
of the inspected roots, not a database-wide audit of every possible transient write.
No Production deployment, database query or configuration mutation was performed.

Focused tests were rerun: 33/33 PASS, including seven integration tests. No application source
changed during this final gate attempt; prior typecheck/lint/local-build evidence remains applicable.
Final diff check PASS. Only this checkpoint was edited during final validation; existing route,
Workspace TSX/CSS and integration test remain local and uncommitted. HEAD remains 04bc8eb.

Decision needed: authorize correction/verification of Preview-only environment delivery for
this branch, then rebuild and repeat the authenticated AP-CRM-006 gates. Do not copy Production
credentials, weaken guards, or change application contracts to conceal missing configuration.
No next functional slice begins. All nine operational capabilities remain UNRESOLVED.

## Controlled checkpoint / commit / push authorization — 2026-10-22

The user's AP-CRM-006 controlled checkpoint/commit/push contract now authorizes preservation
of the already validated local slice and a normal push of fix/crm-runtime-integration to its
existing tracking branch. It supersedes the earlier no-commit/no-push boundaries for this
preservation step only. It does not declare AP-CRM-006 Preview PASS, authorize implementation,
or start another slice. The final commit SHA and push result are reported separately.

The user reports Preview branch Auth configuration corrected for NEXT_PUBLIC_SUPABASE_URL
and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, with Auth verified on a legacy Preview. This is
user-supplied readiness evidence; the current AP-CRM-006 source still requires new branch
Preview/teste2 validation after push. No Vercel configuration was changed by this task.

### Git preflight and ownership classification

Branch: fix/crm-runtime-integration; pre-commit HEAD 04bc8eb; initial index empty.
Initial tracked diff: two files, 82 insertions / 5 deletions; three untracked files below.

| Modified/untracked path | Classification |
| --- | --- |
| app/negociacoes/[negotiationId]/page.tsx | AP-CRM-006 OWNED |
| features/opportunity-workspace/components/OpportunityWorkspace.tsx | AP-CRM-006 OWNED |
| features/opportunity-workspace/components/OpportunityWorkspace.module.css | AP-CRM-006 OWNED |
| tests/negotiation-workspace-integration.test.mjs | AP-CRM-006 OWNED |
| docs/agents/AP-CRM-006-CHECKPOINT.md | AP-CRM-006 OWNED |

The Workspace files include both canonical presentation and previously preserved AP-CRM-006B.1R
cockpit/disclosure UX. The current preservation contract covers the validated AP-CRM-006 state;
these existing same-slice UX changes are included intact, without new design or behavior changes.
No PREEXISTING / UNRELATED or UNCERTAIN modified/untracked files were found. Nothing was
reverted, restored, stashed or opportunistically refactored in this preservation task.

Existing tracking branch: origin/fix/crm-runtime-integration. Live remote tip verified as
8d2a7a188329d26744b4e5bc5de2b1ed6af204b5. `git merge-base --is-ancestor` confirms it is an
ancestor of the local HEAD, so no history reconciliation is needed. The branch push necessarily
includes thirteen previously local ancestor commits plus the new AP-CRM-006 commit; it is not
a push to main. Remote concurrency remains protected by normal non-force push semantics.

### Revalidation and commit boundary

- PASS: established focused test command above — 33/33, including seven integration tests.
- PASS: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- PASS: changed-file ESLint for canonical route, Workspace TSX and integration test — zero
  errors, same two pre-existing legacy warnings.
- PASS: `git diff --check`.
- Build not repeated: route/Workspace SHA-1 digests match the previously built/runtime-validated
  source recorded above; integration test digest is 3a685e6d5194c3d87842887796467336f03e114f.
  Only checkpoint documentation changes in this task.

Stage exactly the five classified paths, inspect staged list/diff and run cached diff check,
then commit `feat(crm): integrate canonical negotiation workspace`. Push only HEAD to the
existing origin refs/heads/fix/crm-runtime-integration, without force, amendment, PR or merge.
Stop on failed gates, remote divergence or destructive-reconciliation requirements.

No schema/migration, database access, commercial write, Production operation or application
code modification is performed in this preservation task. Local desktop/mobile and 404 evidence
remain as recorded above. The nine unresolved sections are events, notes, communications,
tasks, nextAction, documentRequests, approvals, objections and checkout.

Next action after successful push: validate the new Vercel branch Preview against teste2.
This task stops after push reporting; it does not execute that validation or any next slice.
