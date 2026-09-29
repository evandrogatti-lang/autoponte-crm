# AutoPonte Agent Job Contract

Every Agent execution must start from a bounded job contract.

## Job

- ID:
- Objective:
- Expected result:

## Scope

### Allowed
- Files/directories:
- Systems:
- Operations:

### Preserve
- Existing API contracts
- Domain boundaries: Lead/Funil, Match, Negociação, Cases
- Tenant isolation and membership/role rules
- Existing behavior outside the slice

### Do not
- Perform opportunistic refactors
- Change database schema or persistent data unless explicitly authorized
- Change API contracts outside the stated scope
- Replace the official AutoPonte stack
- Use destructive Git operations
- Expand repository exploration without a concrete dependency

## Validation

Define before execution:

- TypeScript:
- Lint:
- Tests:
- Build:
- Functional validation:
- Regression checks:
- Git diff/status:

A failing pre-existing gate must be reported separately from regressions introduced by the slice.

## Stop conditions

Stop and return to ChatGPT when:

- an unexpected dependency requires scope expansion;
- an API or domain contract would need to change;
- a database/schema/migration change becomes necessary;
- tenant isolation or security assumptions become uncertain;
- an architectural decision is required;
- validation reveals an unexplained regression;
- investigation becomes repetitive without producing a concrete change or test result.

Do not silently expand the task.

## Completion evidence

Return:

1. Files changed.
2. What changed.
3. Validation commands and results.
4. Known pre-existing failures.
5. Remaining risks or follow-up work.
6. `git diff --stat`.
7. `git status --short`.

Do not commit unless the job explicitly authorizes a commit after validation.
