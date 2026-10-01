# AP-CRM-001 — Controlled Runtime Smoke Test — CHECKPOINT

## Status

CRM RUNTIME VALIDATED

- Date: 2026-10-01
- Branch: `fix/crm-runtime-integration`
- HEAD at checkpoint creation: `ef242ec776b9a6c6ccced7c462aa4f46cb9b2d20`

Runtime validation and configuration-resolution facts below record the completed cycle supplied in the approved checkpoint contract. This documentation slice did not repeat runtime testing or change configuration.

## 1. Runtime target

- Vercel project: `autoponte-crm`
- Environment: Preview
- Runtime branch: `fix/crm-runtime-integration`
- Database environment: Supabase teste2
- Supabase project ref: `prcmlynykncfgzwluoef`

## 2. Authentication

The obsolete CRM dependency on `/signin-with-chatgpt` was removed from the active authentication path. The CRM now uses the existing Supabase authentication flow.

Validated flow:

```text
/crm
→ /login?return_to=%2Fcrm
→ Supabase authentication
→ /crm
```

Authentication was successfully validated in the real Preview runtime with the existing Preview user.

Relevant implementation commit in history:

- `39d2b622b1d6f4c31eb4821de59b4c56cb5fa4a8`
- `fix(auth): use supabase login for crm access`

Preserved:

- tenant model and membership;
- owner / manager / seller roles;
- StoreAccess;
- Cases authentication/authorization;
- API contracts;
- Match behavior;
- database schema and RLS.

## 3. Database connectivity incident

Initial authenticated runtime validation produced failures across multiple CRM routes. The observed shared failure was:

```text
getaddrinfo ENOTFOUND db.prcmlynykncfgzwluoef.supabase.co
```

Supabase authentication worked while Drizzle/database reads failed.

Read-only diagnosis confirmed:

- required inspected tables/columns existed in teste2;
- no demonstrated schema mismatch;
- no demonstrated missing migration;
- no demonstrated RLS failure;
- no demonstrated missing seed-data requirement.

The failure was isolated to Preview database connectivity.

## 4. Database connectivity resolution

The Preview `DATABASE_URL` for `fix/crm-runtime-integration` was configured to use the Supabase teste2 Session Pooler instead of the direct database endpoint.

Non-sensitive connection metadata:

- Host: `aws-1-eu-west-3.pooler.supabase.com`
- Port: `5432`
- Database: `postgres`
- User: `postgres.prcmlynykncfgzwluoef`

Branch-specific Preview environment configuration was used to preserve separation from Production and unrelated Preview branches. No Production database credentials or configuration were intentionally changed as part of this resolution.

No password or complete connection URI is recorded here.

## 5. Runtime validation result

After deployment with the corrected Preview configuration:

- Supabase login works;
- CRM authentication redirect works;
- Central de Operações loads;
- Configurações loads;
- Recomendações loads;
- Potenciais clientes loads;
- Clientes loads;
- Oportunidades loads;
- Cases loads;
- Propostas loads;
- Estoque / Veículos loads;
- Trocas loads;
- Correspondências IA / Matches loads.

Manual smoke testing confirmed that the principal CRM areas are accessible in the authenticated Preview runtime. This does not mean that every feature or workflow is functionally complete. Known product, UX, data-model, navigation, and handoff issues remain.

## 6. Important conclusions

The Match Engine is no longer the primary blocker. The CRM basic runtime is operational in the controlled Preview/teste2 environment.

The previous runtime failures did not require:

- schema migration;
- RLS changes;
- tenant redesign;
- database reset;
- production changes.

The next work should return to CRM product/domain integration rather than continued infrastructure troubleshooting.

## 7. Next planned slice

AP-CRM-002 — Canonical CRM Flow Decision

Define formally:

```text
Lead → Match → Negociação → Case / Outcome
```

Primary decision: determine which persisted entity should sustain the Negociação workspace and define the explicit handoff from qualified Match to Negociação.

Preserve the domain distinction:

- Lead = customer demand / interest.
- Match = system-detected Buyer ↔ Vehicle opportunity.
- Negociação = operational commercial workspace.
- Case = distinct commercial/process structure.

Do not merge these concepts without an explicit architectural decision.

## 8. Runtime baseline

Future CRM work should use:

- Branch family: `fix/crm-runtime-integration` or its approved successor.
- Preview: Vercel Preview only.
- Database: Supabase teste2.
- Database access: Session Pooler for the current Preview server/database path.

Production remains separate. Never substitute Production credentials into Preview when Preview/teste2 configuration is missing.
