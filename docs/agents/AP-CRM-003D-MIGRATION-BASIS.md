# AP-CRM-003D migration basis (before staging writes)

Date: 2026-10-02 Europe/Berlin. Target: teste2, `prcmlynykncfgzwluoef` only.
Starting branch: `fix/crm-runtime-integration`. HEAD: `df504cc395000f02e6d82d2186b7da64d6ffbb2b`. Starting status: only the intentionally untracked Negotiation design.

Adoption checkpoint: the user approved the existing uncommitted implementation. At adoption, `db/pilot-schema.ts` and `db/schema.ts` were modified; Customer/identity schema modules, migration 0026, the identity service/contracts and this basis were untracked, along with the untouched Negotiation design. The earlier starting-status statement above describes the original implementation's basis, not the adoption status.

Read-only live inspection confirmed 0026 was unapplied: no `buyer_profiles.customer_id`, no link/event tables, no identity functions, and no corresponding migration ledger entry. The live Match FK is `FOREIGN KEY (buyer_profile_id) REFERENCES buyer_profiles(id) ON DELETE CASCADE`; orphan count and typed source/Case Tenant mismatch count are zero. Counts before applying: 52 BuyerProfiles, 53 Leads, 51 Customers and 51 Cases.

Before-state business hashes (MD5 of ordered JSONB rows; BuyerProfile comparison excludes only the newly added `customer_id`): profiles `0a7a24685d7c0bc4249b930b6886b05e`, Leads `f16d6a5c80538bb6c4e202986ffbf480`, Customers `023bc4f693070eee743159e9b5eb2720`, Cases `86179846212224d212c9263f8b7b1eca`, Matches `01f19aa56e0d695af474cadfe3580832`.

Pre-application rehearsal executed the complete DDL and behavioral validation in one rollback-only transaction. It caught and corrected a shared-trigger record-field error before any DDL was committed. The corrected rehearsal passed. The migration adds no identity assignments to the 52 profiles or 53 Leads, and no existing business column is updated.

The approved Tenant prerequisite remains intact. The migration adds nullable BuyerProfile Customer identity, a one-current-row-per-Lead association and append-only identity events. It does not populate identity from contact fields, fixture ID families, CustomerIntents or Cases.

Although 51 historical CustomerIntents contain explicit Customer/Profile references and Cases contain Customer/Lead references, these describe Case-local demand/workflow relationships. They do not record general identity confirmation by an authenticated Membership. Most intents are historical. They are not promoted to confirmed identity. All existing BuyerProfiles and Leads remain unresolved. The resume instructions explicitly permit leaving unresolved data; no fixture identity policy is invented or requested as a prerequisite to the schema/service implementation. A future fixture backfill requires explicit confirmation policy and provenance.

Match already has a live `vehicle_matches_buyer_profile_id_fkey` (ON DELETE CASCADE), but Drizzle omitted it and historical initial Match DDL did not declare it. There are zero orphan profiles or typed trade-in Tenant mismatches. The migration preserves/ensures this FK, adds a lookup index and checks existing typed trade-in/Case Tenant coherence. Match derives identity through BuyerProfile; no Match Customer or Tenant copy is introduced. Global catalog and tenantless legacy vehicle sources remain advisory sources with unchanged scoring/semantics.

No existing business field is written. New links/events start empty and BuyerProfile customer_id starts null. Staging behavioral probes run in rollback-only transactions. Production, Tenant Model V1, Case semantics, CRM pages and intake contracts are outside the changes.

Confirmation requires a normally authenticated server-side Tenant resolver, a matching active Membership/User and role, explicit reason/source, and an expected previous Customer. Root locks serialize competing corrections; stale expectations fail with CONFLICT. Database composite FKs prevent cross-Tenant references. SQL functions use SECURITY INVOKER and are not callable by public/anon/authenticated. New tables have RLS with no client grants; existing policies are unchanged.
