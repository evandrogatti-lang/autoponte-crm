# Existing repository lint debt

Recorded at the AP-CRM-003D1D checkpoint on 2026-10-01.

Repository-wide ESLint reports 57 pre-existing errors and 24 warnings in unrelated files and backup directories. None of the error files belongs to AP-CRM-003D1D. This is existing technical debt, not a regression introduced by tenant ownership reconciliation.

The user approved scoped lint for this checkpoint. Changed-file lint passes with zero errors and one pre-existing unused `sql` import warning in `db/schema.ts`. Unrelated lint remediation is outside this slice.
