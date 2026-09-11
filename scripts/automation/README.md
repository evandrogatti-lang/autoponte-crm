# AutoPonte CRM Local Automation

PowerShell 5.1-compatible commands for read-only inventory, technical validation, homologation planning, and report consolidation.

## Safety contract

- Run from `C:\AutoPonteDev\autoponte_work` without administrative privileges.
- Git calls use `gc.auto=0`, `--no-optional-locks`, and a read-only command allowlist.
- The scripts never add, commit, push, pull, fetch, merge, rebase, reset, checkout, restore, clean, or stash.
- Existing files are never corrected, cleaned, restored, moved, renamed, or overwritten.
- `.env`, credential, key, cookie, token, and secret contents are never read by the automation layer.
- Possible secrets are classified only from path and file name.
- Working-tree fingerprints hash only an ordinally sorted UTF-8 list of `Git status<TAB>normalized path`; file contents and metadata are not opened or hashed.
- Reports use a historical directory and `CreateNew`; an existing report is never overwritten.
- No failure is called preexisting or a regression without a versioned and proven baseline. Current failures are `UNBASELINED`.

## Run lifecycle

Choose an explicit run ID, start with inventory, and pass the same ID to every other command:

```powershell
$runId = "manual-20260911-001"
.\scripts\automation\inventory.ps1 -RunId $runId
.\scripts\automation\validate.ps1 -RunId $runId
.\scripts\automation\homologation.ps1 -RunId $runId
.\scripts\automation\report.ps1 -RunId $runId
```

Artifacts are kept together and never overwritten:

```text
artifacts/automation/YYYY-MM-DD/HHmmss-<runId>/
  inventory.json
  validation.json
  homologation.json
  report.json
  report.md
```

Inventory creates the run directory. The other commands require that exact existing RunId and fail if it is missing, duplicated, or incompatible:

```powershell
.\scripts\automation\inventory.ps1 -RunId local-audit-001
```

## inventory

```powershell
.\scripts\automation\inventory.ps1 -RunId <id>
```

Uses `git status` without reading file contents to classify modified and untracked paths as code, tests, documentation, artifacts, local configuration, temporary files, worktrees, or possible secrets. Candidates for `.gitignore` are recommendations only; `.gitignore` is never changed.

## validate

```powershell
.\scripts\automation\validate.ps1 -RunId <id>
```

Before running any tool, validation blocks fail-closed when Git status cannot be read or the checkout contains tracked modifications, staged files, or conflicts. Untracked paths are listed in `validation.json` but do not block and are never added or removed.

Run only the checkout checks, without lint, TypeScript, tests, build, or `git diff --check`:

```powershell
.\scripts\automation\validate.ps1 -RunId <id> -Preflight
```

Preflight requires a RunId previously created by inventory and creates that run's `validation.json`. Reports are immutable, so use a new run for a later full validation.

After a clean checkout preflight, full validation prints all expected generated paths. It then runs `git diff --check`, lint, TypeScript with incremental output disabled, Match Core tests, build, and general rendered HTML tests. Checks continue after a tool failure so the report is complete, but any failure produces a nonzero exit code.

Build tools may update `.next/**`, `next-env.d.ts`, or `tsconfig.tsbuildinfo`. These effects are announced before execution and detected afterward. The script never removes or restores them.

## homologation

Default mode is local preflight and planning only:

```powershell
.\scripts\automation\homologation.ps1 -RunId <id>
```

Real execution requires all of the following and an explicit switch:

- `-Execute`;
- `VERCEL_ENV=preview`;
- an HTTPS `PREVIEW_URL` under `*.vercel.app` whose host is not production-like;
- `HOMOLOGATION_SUPABASE_PROJECT_REF=prcmlynykncfgzwluoef`;
- `NEXT_PUBLIC_SUPABASE_URL=https://prcmlynykncfgzwluoef.supabase.co`;
- presence of `VERCEL_AUTOMATION_BYPASS_SECRET` (its value is never printed);
- `AUTOMATION_IDENTITY_AUTHORIZATION=SYNTHETIC_TEST_IDENTITIES_ONLY`;
- synthetic storage-state paths in the persona variables listed in `homologation.json`.

```powershell
.\scripts\automation\homologation.ps1 -RunId <id> -Execute
```

The automation accepts no username or password. Missing persona coverage is reported as `BLOCKED` or `NOT_IMPLEMENTED`, never as passing.

## report

```powershell
.\scripts\automation\report.ps1 -RunId <id>
```

Reads only the three JSON files from the same run and creates `report.json` and `report.md`. Missing evidence or non-passing results produce a nonzero exit code.

## Syntax and import validation

Every entrypoint supports a side-effect-free import check:

```powershell
.\scripts\automation\inventory.ps1 -RunId import-check -ImportOnly
.\scripts\automation\validate.ps1 -RunId import-check -ImportOnly
.\scripts\automation\homologation.ps1 -RunId import-check -ImportOnly
.\scripts\automation\report.ps1 -RunId import-check -ImportOnly
```