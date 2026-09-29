# AutoPonte Validation Procedure

This document defines the default validation procedure for AutoPonte implementation slices.

Validation must be proportional to the slice. Do not run or fix unrelated systems merely to obtain a globally clean result.

## 1. Pre-validation

Before validating:

1. Confirm the current branch.
2. Inspect `git status --short`.
3. Confirm which files are expected to have changed.
4. Identify generated artifacts that must not enter the slice.

Recommended commands:

- `git branch --show-current`
- `git status --short`
- `git diff --stat`

Unexpected changes must be classified before continuing.

## 2. TypeScript

Use the repository script when one exists.

If no typecheck script exists, use `npx tsc --noEmit`.

Do not add a new npm script merely to validate an unrelated slice.

A generated `tsconfig.tsbuildinfo` change must be classified separately and must not be included in the slice unless intentionally required.

## 3. Lint

Run the repository lint command when available.

Lint failures must be classified as:

- introduced by the current slice;
- pre-existing;
- caused by a tooling/configuration change in the current slice;
- unresolved.

Do not fix unrelated lint debt inside the current slice.

If classification is uncertain and materially affects acceptance of the slice, stop and investigate only enough to determine whether the slice introduced the regression.

## 4. Tests

Run tests relevant to the changed behavior when available.

Prefer focused tests before broad test suites.

Do not create unrelated tests solely to satisfy a generic checklist.

Record when no relevant automated test exists.

## 5. Build

For changes that can affect compilation, bundling, routing, rendering, dependencies, or deployment behavior, run the repository production build.

A successful build does not by itself complete validation.

## 6. Functional validation

When the slice changes user-visible or operational behavior, validate the affected flow directly.

Check the relevant role, viewport, and environment when applicable.

Only validate dimensions relevant to the slice.

## 7. Regression checks

Verify behavior that the slice explicitly promises to preserve.

Pay particular attention when relevant to:

- API contracts;
- authentication;
- tenant isolation;
- StoreAccess;
- Lead / Funil boundaries;
- Match behavior;
- Negociação behavior;
- Cases;
- persistent data.

Do not broaden regression testing without a concrete risk.

## 8. Final diff review

Before declaring the slice complete, run:

- `git diff --check`
- `git diff --stat`
- `git status --short`

Review the actual diff for:

- unexpected files;
- generated artifacts;
- accidental formatting churn;
- unrelated refactors;
- contract changes;
- environment-specific credentials or configuration.

## 9. Validation result

Report each applicable gate as:

- PASS
- FAIL
- NOT APPLICABLE
- BLOCKED
- PRE-EXISTING FAILURE

A pre-existing failure must not be reported as a regression introduced by the slice.

A failed relevant gate introduced by the slice blocks completion.

## 10. Commit gate

Commit only after:

1. Expected changes are confirmed.
2. Relevant validation has completed.
3. Regressions have been checked.
4. Final diff/status has been reviewed.
5. Known pre-existing failures are recorded separately.

Use a small semantic commit describing the slice.

After the commit, confirm the working tree state before starting the next slice.