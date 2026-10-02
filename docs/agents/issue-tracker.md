# Issue/task tracker: Local files

Issues, tasks, decisions, and execution checkpoints live in
`docs/agents/`.

## Existing authority

- Follow `AGENT_JOB.md`, `AUTOPONTE_SLICE.md`, and
  `AUTOPONTE_VALIDATION.md` in this directory.
- Read the relevant Task Contract and associated checkpoints.
- Preserve existing IDs, filenames, contracts, historical evidence,
  execution rules, and authorization boundaries.
- Planning or recording a task does not authorize its implementation.
- Do not infer current status from an ID or filename alone; read the
  relevant contract and subsequent checkpoint evidence.

## Fetching a task

Read the supplied file path. If given an ID, locate matching files in
`docs/agents/` and read the contract and relevant checkpoints.
If the reference is ambiguous, ask for clarification.

## Publishing a task

Create a local Markdown Task Contract in `docs/agents/`, following
`AGENT_JOB.md` and the established task naming conventions.
Use an explicitly assigned ID; if none is available, ask before
allocating one. Never renumber existing tasks.
Keep checkpoint and supporting-document naming consistent with the
relevant Task Contract.

## Updates and completion

Preserve historical checkpoint evidence. Record new findings in the
appropriate task or supporting document within the authorized scope.
Follow the contract's validation and completion requirements.
Do not introduce a new status vocabulary, labels, claim mechanism,
directory hierarchy, or task numbering scheme through this setup.

## Tracker operations

When a skill says "publish to the issue tracker", write the authorized
local task document in `docs/agents/`.
When it says "fetch the relevant ticket", read the referenced local
Task Contract and checkpoints.
For workflow operations not covered by existing contracts and rules,
ask before introducing a new convention.
Do not create GitHub Issues, use `.scratch/` as a tracker, or install
additional skills as part of this setup.
