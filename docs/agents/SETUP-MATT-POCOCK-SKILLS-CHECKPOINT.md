# Matt Pocock Skills Setup — CHECKPOINT

## Status

SETUP VALIDATED — UNCOMMITTED

- Date: 2026-10-02
- Branch: `fix/crm-runtime-integration`
- HEAD at checkpoint creation: `a5fff501adceaf679d5d6216a5816c3514640208`
- Authorization: review only `.agents/` and `skills-lock.json`; create this checkpoint if validation passes. Preserve installed skills and existing files. No staging, commit, or push.

## 1. Installed skills

Exactly four skills are installed under `.agents/skills/` and recorded in lockfile version 1. All entries use source `mattpocock/skills` and source type `github`.

| Skill | Source skill path | Verified computedHash |
| --- | --- | --- |
| grill-me | skills/productivity/grill-me/SKILL.md | 5e0c683385eafd83f106ac6c9d67dfbbfe5aa4b3fe65aad114eb1055a99c818f |
| grilling | skills/productivity/grilling/SKILL.md | 4fa026e5979770347b3357ff5139e1e41d21c3a9f7335e9cd2811cb5b8d32f2f |
| handoff | skills/productivity/handoff/SKILL.md | 9ea2a5de5ca2d717f913356de982fdc4fe27d28a300c16598cd43a4865491008 |
| setup-matt-pocock-skills | skills/engineering/setup-matt-pocock-skills/SKILL.md | a3da0aad329e835ea00a8d8f2a94278ca163b9b8f6fb10d24fca8bc113027bb0 |

## 2. Setup files

The user approved and created these three files in the preceding setup step:

- `AGENTS.md`: references existing execution rules and skill configuration.
- `docs/agents/issue-tracker.md`: local issue/task tracker in `docs/agents/`, preserving Task Contracts, IDs, checkpoints, and authorization boundaries.
- `docs/agents/domain.md`: single-context domain documentation consumer rules; no glossary or ADR placeholders.

This review did not modify those files. Existing Task Contracts, AP-CRM documents, checkpoints, and execution rules remain unchanged. No triage skill or repository triage configuration was added.

## 3. Validation results

- PASS: complete recursive, hidden-inclusive inventory and content review of `.agents/`; exactly 13 expected files and no unexpected content or reparse points.
- PASS: each skill contains `SKILL.md` with matching frontmatter name and `agents/openai.yaml`.
- PASS: the setup skill additionally contains its five seed documents: `domain.md`, `issue-tracker-github.md`, `issue-tracker-gitlab.md`, `issue-tracker-local.md`, and `triage-labels.md`. These are installed templates, not active tracker configuration or additional installed skills.
- PASS: `skills-lock.json` parses as JSON, has version 1, and lists exactly the four installed skills with consistent source metadata and source paths.
- PASS: all four `computedHash` values match SHA-256 over each skill folder's files sorted by relative path, concatenating each UTF-8 relative path (forward slashes) and its raw file bytes. A hash of `SKILL.md` alone is not the folder hash.
- PASS: starting branch and HEAD recorded using `git branch --show-current` and `git rev-parse HEAD`.
- PASS: starting `git status --short` matches the prior setup state; no tracked changes or conflicting changes were found.
- PASS: preceding setup `git diff --check` and new-file whitespace review found no whitespace errors. Final checkpoint whitespace and status checks are reported in the task result.
- NOT APPLICABLE: application tests, build, database, browser, and deployment validation; this is a local skill review and documentation checkpoint.

## 4. Working tree and boundaries

Starting untracked paths: `.agents/`, `AGENTS.md`, `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, and `skills-lock.json`.

This review creates only `docs/agents/SETUP-MATT-POCOCK-SKILLS-CHECKPOINT.md`. Installed skills and the lockfile are unchanged. No skills were installed, GitHub Issues created, remotes changed, or files staged, committed, or pushed.

Stop at this setup checkpoint. This document does not authorize another implementation slice.
