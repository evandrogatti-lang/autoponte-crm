# AP-CRM-004V2B — first synthetic homologation batch

Status: PASS. Executed once on 2026-10-02 at 16:50:11.035 UTC (18:50:11.035 Europe/Berlin).
Branch: fix/crm-runtime-integration. Execution source base: 67b92548347a9dcac3fc845d5a2fceef9653b829,
plus the temporary internal trigger and its tests. Executor logic and manifest were unchanged.
Preview: https://autoponte-k47xx2nnb-auto-ponte.vercel.app

## Authenticated execution

The existing authenticated POST executor required a browser-accessible trigger; the B1 contract
explicitly authorizes a minimum staging-only control. The new internal page/server action invokes
the same validated executeFirstSyntheticBatch with an empty object, never identity/source inputs.
It is absent from normal navigation and denies unverified environments and unauthorized actors.
Next server-action same-origin protection supplements, and does not replace, existing service gates.

The previous oukabti9h Preview lacked NEXT_PUBLIC_SUPABASE_URL at build/runtime and no batch
was executed there. The user supplied a newly authenticated k47xx2nnb Preview. Its internal page
confirmed environment guard PASS, Preview/teste2/approved branch, fixed Tenant, active owner.

Tenant: 03824f9e-0924-435e-8b20-50b8ea52774b.
Authenticated User: a87d979a-9b77-4ac1-8654-7af758abac24.
Active owner Membership: 5898a810-dcd1-4ed6-9597-70bdbf61c73d.
The actor was resolved from the real application session, never supplied through SQL or the client.

Before write: exactly five inventory sources and two aliases existed with exact persisted pairs;
both aliases belonged to the approved Tenant; zero batch roots and zero mappings for all seven
sources. Before counts/hashes were captured through read-only teste2 queries.
One browser submission returned EXECUTED. No replay submission was made.
The validated service rechecked auth -> guard -> Tenant/Membership/owner -> fixed manifest ->
one transaction, with advisory lock, source locks, database actor revalidation and final state check.

## Exact resulting roots and mappings

All five roots: approved Tenant; qualification; vehicleSpecificationId NULL.

| Unit | Inventory source | TenantVehicle UUID | Trade-in alias |
| --- | --- | --- | --- |
| U1 | phase2-p2-01-vehicle | e09b16a6-e663-4ab8-865c-72fad84d8d90 | none |
| U2 | phase2-p2-02-vehicle | 7d0e9093-0ee2-4f19-a259-db592ba81f17 | none |
| U3 | pilot-p1-01-vehicle | a99a79c0-20e3-4c8e-8074-c5789a69d6c1 | none |
| U4 | phase2-p2-03-vehicle | 88f51c7b-59e4-4948-9725-7c3d485b3fe5 | phase2-p2-03-opportunity |
| U5 | pilot-p1-02-vehicle | e4bbf140-35c3-4d7f-b57f-85cd7f8ab29e | pilot-p1-02-opportunity |

| Source | Mapping UUID | Unit |
| --- | --- | --- |
| inventory: phase2-p2-01-vehicle | 07606544-dcb0-4805-8d7e-6d48fa28c48f | U1 |
| inventory: phase2-p2-02-vehicle | 96dc1a9a-f5c1-4ae1-9d3a-cb916cfd1c0f | U2 |
| inventory: pilot-p1-01-vehicle | 3fe9d340-cf3e-4012-a6a3-2986427707c4 | U3 |
| inventory: phase2-p2-03-vehicle | 3301f958-9285-4183-922c-9820bc28bfc2 | U4 |
| trade_in: phase2-p2-03-opportunity | 81c4a3bf-8f73-4e3c-a5ab-9c4f7f98a74b | U4 |
| inventory: pilot-p1-02-vehicle | 77786d93-0863-4962-8ee1-22c55a1dcfdd | U5 |
| trade_in: pilot-p1-02-opportunity | 50cbcdc3-20e3-4a69-8887-17081b9d1e5c | U5 |

Persisted JSON provenance was read and verified: AP-CRM-004V2A policy, AP-CRM-004V2 reference,
first_synthetic_batch_5, synthetic_homologation, teste2, approved Tenant, explicit_approved_manifest,
realPhysicalVehicleVerified=false, exact original source/inventory/alias, actual User/Membership,
shared timestamp above and reason. Root/link provenance checks both returned true.
These fictitious units do not assert real physical identity and must never automatically promote
to Production or verified physical vehicles. No technical identity was inferred.

## Database evidence

Hash expression: md5(string_agg(row_to_json(r)::text,'' order by id)). Same expression and tables
were queried immediately before and after execution; hashes include full persisted rows.

| Table/population | Before -> after | Unchanged hash |
| --- | --- | --- |
| vehicle_matches (all, including AP-CRM-005 fixture) | 254 -> 254 | 72d362c5d722fb8b527819c1fa3bd1b5 |
| vehicles | 52 -> 52 | f3891552a26ddb6a95d64c8c1b86b37c |
| trade_ins | 54 -> 54 | 831cd19018768a3ba3f5fc49cfa75dc6 |
| negotiations | 1 -> 1 | 6d873fafe130c441c9c4d40ecf7d71be |
| vehicle_specifications | 0 -> 0 | NULL (empty) |
| pre-existing TenantVehicle, excluding new batch | 1 -> 1 | f2c38458c322306496442042babffd5a |
| pre-existing source mapping, excluding new batch | 1 -> 1 | 341296fb76ed342b8ad2d900d2bee252 |

tenant_vehicles: 1 -> 6 (+5); after hash cd0511a7bc64b8724d9a931c56a0ac1d.
tenant_vehicle_source_links: 1 -> 8 (+7); after hash a01347c70d9bbc936f08d5d1f3423f02.
Exactly five marked roots and seven associated links were present; no other links were added.
No availability transition, new Negotiation, specification, schema or migration occurred.
All database connector queries were reads scoped to project prcmlynykncfgzwluoef; the only business
writes were the real Preview authenticated executor transaction. No Production resource was changed.

Canonical resolve_match_vehicle was queried for each legacy Match, via its BuyerProfile Tenant.
The AP-CRM-005 fixture Match 88b49441-cb45-4089-a48d-1fa30310cced was excluded from the legacy count.
Result: total 253; resolved 16; unresolved 237; actionable 0. All 16 returned actionable=false.

| Unit | Resolved legacy Match IDs |
| --- | --- |
| U1 | phase2-p2-01-match-1, phase2-p2-38-match-4, phase2-p2-39-match-3, phase2-p2-40-match-2 |
| U2 | phase2-p2-01-match-2, phase2-p2-02-match-1, phase2-p2-39-match-4, phase2-p2-40-match-3 |
| U3 | pilot-p1-01-match |
| U4 | phase2-p2-01-match-3, phase2-p2-02-match-2, phase2-p2-03-match-1, phase2-p2-40-match-4, 6f8301b6-c402-4249-9bbc-b44237f49dab |
| U5 | pilot-p1-02-match, e03b5b5f-799d-4c23-997a-c153eb39b441 |

## Validation and stop

54 focused guard/endpoint/executor/trigger tests PASS; typecheck, changed-file lint,
production build and git diff --check PASS before deployment/execution. The three added trigger
tests verify client-field rejection, sanitized errors without retry, and canonical replay forwarding.
Prior B1 rollback/replay tests remain adapter-based as documented; no live failure/replay batch
was executed. The real successful transaction and canonical resolver results are now verified.

OpportunityWorkspace changes were preserved untouched and excluded from this slice's commit.
No executor or manifest logic changed. No further availability batch was started.
Temporary executor and trigger removal remain a separate cleanup slice. Committed source links
are append-only; post-commit correction/removal requires a separate approved audited decision,
not an ad-hoc DELETE or destructive rollback. Transaction failures roll back before commit.
