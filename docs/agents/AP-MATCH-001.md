# AP-MATCH-001 — Offline characterization of the existing Match scorer

## Job and authorization

- Planning baseline: `chore/agent-execution-framework` at `bb19e562d9bcb7a6ce4337bbd0861d3d522bee20`, with a clean working tree.
- Slice name: Legacy Match scorer characterization.
- Objective: add independently runnable, synthetic-data tests that pin the existing `scoreBuyerVehicle` scores and ordered explanations before any future Match redesign.
- Expected result: one test file, one logical checkpoint, no application behavior changes.
- This document defines future work only. It does not authorize implementation during AP-MATCH-001 planning, commit, push, merge, or deployment.
- Follow `AGENT_JOB.md`, `AUTOPONTE_SLICE.md`, and `AUTOPONTE_VALIDATION.md` in this directory.

## Evidence and bounded inspection

- `lib/match-engine.ts`: exported input types and synchronous scorer; the same module imports the database and contains match creation writes. Do not import or execute that module directly in tests.
- `app/matches/page.tsx`: consumes scores and JSON reasons; authenticated database-backed UI, outside implementation scope.
- `lib/opportunities/domain.ts` and `lib/opportunities/types.ts`: opportunity status/stage and workspace contracts. No integration is required for this slice.
- `docs/rfc/RFC-0013-Matches-Recomendacoes-IA-Acao-Comercial.md`: proposed future Match architecture, not authority to change current weights or implement the MVP.
- `package.json`, `tsconfig.json`, `scripts/test-ade.mjs`, and `scripts/test-operational.mjs`: existing TypeScript dependency, Node test runner, and focused validation precedent. No dedicated Match test command exists in the inspected scripts.
- Future execution needs only this contract, the three framework documents, `lib/match-engine.ts`, and `package.json`; the other evidence above is optional read-only context. Do not inventory the repository again.

## Scope

### Allowed future changes

- Create only `tests/match-score.test.mjs`.
- Read only the bounded inputs listed above and installed TypeScript tooling needed to run the test.
- Run local offline validation with synthetic fixtures and no credentials.

### Explicitly forbidden

- Every other file is forbidden for modification, including `lib/match-engine.ts`, all `lib/opportunities/**`, `lib/ade/**`, `app/**`, `components/**`, `features/**`, `db/**`, `drizzle/**`, `supabase/**`, existing tests/scripts, package manifests/lockfiles, TypeScript/lint configuration, environment files, and deployment configuration.
- No database imports, schema inspection, migrations, persistence, authentication changes, tenant/StoreAccess changes, CRM records, network calls, live browser flows, UI changes, scoring redesign, ranking, alerts, recommendations, or contact actions.
- No dependency installation, environment loading, production/staging access, commit, push, merge, or deploy.

## Assumptions and implementation boundary

- Node satisfies the repository engine requirement and the existing local `typescript` dependency is installed. If unavailable, stop; do not install it within this slice.
- Current scores are legacy behavior to characterize, not approved business requirements or calibrated compatibility percentages.
- Use the TypeScript AST to select exactly the top-level declarations named `BuyerProfile`, `MatchableVehicle`, `normalize`, `parseTypes`, `guessedType`, and `scoreBuyerVehicle` from the real source. Assert declaration kinds, uniqueness, and the expected dependency boundary; fail closed if imports, new external references, or unsupported declarations are needed.
- Transpile only those selected declarations in memory with the installed TypeScript compiler and evaluate them in an isolated Node VM context without `process`, `require`, filesystem, network, or database bindings. Expose only the scorer for assertions. Do not copy the scoring implementation into the test and do not use regex slicing or transpile/evaluate the entire module.
- Use Node's built-in test/assert modules. Keep fixtures in the test file, use invented identifiers and names, and perform no disk writes or generated build output.
- If safe source isolation cannot be achieved within this one file, stop for a separately authorized pure-module extraction contract; do not edit production code as a workaround.

## Acceptance criteria

1. `node --test tests/match-score.test.mjs` succeeds offline without environment variables or database access; the tests invoke the scorer selected from the actual source.
2. Assert exact scores and ordered reasons for a full compatible synthetic pair (100), and a pair with all scoring conditions unmet (0). Verify repeated calls are deterministic and inputs are unchanged.
3. Isolate budget contributions at the maximum (25), just above it (12), exactly 108% (12), and above 108% (0), using all other contributions disabled.
4. Isolate preferred-model contribution (25), category fallback (20), nonmatching category (0), comma/semicolon/slash model separators, and ignored model terms shorter than three characters. Verify accent/case normalization and label-based category guessing.
5. Assert year (15), mileage (12), city (8), transmission (8), and use-case (7) boundary behavior with unrelated contributions disabled. Assert exact Portuguese reasons from the existing source.
6. Pin existing permissive behavior: empty or syntactically invalid `vehicle_types` becomes no category restriction; zero minimum year/maximum mileage grants their points; missing vehicle transmission grants points; `Indiferente` grants transmission points without a reason. These are characterization findings, not endorsements of missing-data semantics.
7. Test harness guards reject unexpected source dependencies before evaluation. Valid JSON of the wrong shape is outside this slice; do not change parsing behavior or add input validation.
8. Only the allowed test file changes; no production, configuration, generated artifacts, or documentation changes enter the implementation checkpoint.

## Validation commands and gates for future execution

Run from the confirmed repository root:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
node --version
node --input-type=module -e "import('typescript').then(() => console.log('TypeScript available'))"
node --test tests/match-score.test.mjs
node --check tests/match-score.test.mjs
./node_modules/.bin/eslint.cmd tests/match-score.test.mjs
git diff --check
git diff --stat
git diff --no-index -- /dev/null tests/match-score.test.mjs
git status --short
```

- The new-file diff command uses Git's null-file convention and exits 1 when it displays a difference; distinguish that expected exit from an actual error.
- Focused tests and syntax/lint are required. TypeScript transpilation diagnostics must also be checked by the harness; this is not whole-project typechecking.
- Whole-project TypeScript, build, `npm test`, browser and database regression checks are NOT APPLICABLE: this test-only slice changes no production compilation, routing, rendering, dependencies, or operational behavior. Do not invoke scripts that load environments or start application services.
- Record unavailable tooling and pre-existing gate failures separately; never repair unrelated files to make a gate pass.

## Stop criteria

- Branch differs from the expected branch; baseline changed materially; unexpected working-tree changes cannot be safely preserved/classified.
- Any file outside the single-file allowlist needs modification, any import requires broader exploration, or safe offline scorer isolation fails.
- A database, schema, migration, credential, production data, network, deployment, UI, API, security, tenant, or architectural decision becomes necessary.
- Tests disagree with inspected behavior and the cause cannot be resolved solely in the synthetic fixtures/harness, or validation shows an unexplained regression.
- Existing tooling is missing or cannot run locally without expanding scope.
- For scope expansion, stop and return exactly `DECISION REQUIRED`; do not implement a workaround.

## Expected completion evidence

Report PASS/FAIL, root, branch, starting HEAD/status, changed file, covered behaviors, exact commands/results, pre-existing failures, final diff review, `git diff --check`, final status, and remaining limits. Explicitly state that characterization does not establish tenant safety, data freshness/provenance, Match v1 correctness, persistence correctness, or end-to-end opportunity behavior. Stop at the reviewed checkpoint without committing.
