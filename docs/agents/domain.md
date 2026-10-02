# Domain docs

## Layout and reading

This repository uses a single-context layout:

- `GLOSSARY.md` at the repository root, when present.
- `docs/adr/` for architecture decision records, when present.

Before relevant exploration, read the glossary and ADRs that apply
to the task. If absent, proceed without creating placeholders.

Read the relevant domain decisions and design documents already
referenced by the Task Contract, including those in `docs/agents/`.
Preserve their historical status and distinguish proposals from
approved decisions and implemented behavior.

## Vocabulary and decisions

Use glossary terms when available and preserve the domain boundaries
defined in `docs/agents/AUTOPONTE_SLICE.md`.
Surface conflicts with applicable decisions explicitly.
Do not silently override them.

## Execution boundaries

Domain documentation does not expand task authorization.
Follow the relevant Task Contract, `docs/agents/AGENT_JOB.md`,
`docs/agents/AUTOPONTE_SLICE.md`, and
`docs/agents/AUTOPONTE_VALIDATION.md`.
Creating or changing domain documents requires authorization within
the task scope.
