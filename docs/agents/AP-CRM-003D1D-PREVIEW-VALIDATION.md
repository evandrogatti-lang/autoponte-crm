# AP-CRM-003D1D Preview runtime validation

Implementation checkpoint: `8d2a7a188329d26744b4e5bc5de2b1ed6af204b5` (`feat(tenant): reconcile CRM tenant ownership`).

Preview: https://autoponte-jtqw6ompo-auto-ponte.vercel.app
Deployment: `dpl_4yLqvmgFcLyzEFH4Bc2vY9q3xmjs`, READY, Git source, target Preview, branch `fix/crm-runtime-integration`. Vercel confirms the implementation checkpoint SHA. Production was not deployed.

## Passed runtime checks

- Public BuyerProfile intake returned HTTP 201. Created ID: `73862b44-da2b-486f-8bb1-3e50aa76d00c`.
- Public trade-in intake returned HTTP 201, protocol `583CFEF0`. Created ID: `583cfef0-41e7-45d1-ae39-71e1dfa7b55c`, three synthetic PNG photos.
- Both rows were read back directly from teste2 (`prcmlynykncfgzwluoef`) and have Tenant `03824f9e-0924-435e-8b20-50b8ea52774b`.
- Both requests supplied conflicting reserved Tenant and fabricated Store fields. Neither affected authoritative ownership. Persisted routes retain null Store; no Store context was assigned.
- Both routes temporarily inactive: BuyerProfile and trade-in each returned HTTP 500, with no failed-probe BuyerProfile row.
- Both authoritative route keys temporarily absent (renamed without deleting configuration): both endpoints returned HTTP 500. Keys and active statuses were restored in finally blocks.
- All four ownership roots have zero tenantless rows. The 204 original manifest rows have unchanged business-row hashes (51/51 in each table).
- The two successful synthetic fixtures and generated matches/photos are retained as runtime test evidence; no original data was deleted.

## Authenticated validation completed

Completed on 2026-10-02 Europe/Berlin, using the user's normal CRM login in Chrome. No credentials were read or copied.

- `/crm` loaded with the operational dashboard and existing data.
- `/clientes`, `/leads`, `/oportunidades`, `/casos`, and the created Lead workspace loaded successfully, with the expected page headings.
- The standard manual Lead form submitted successfully and opened `/oportunidades/15f8a4ba-39a4-4748-9827-a24cd4229815`.
- The created Lead was read back from teste2 with Tenant `03824f9e-0924-435e-8b20-50b8ea52774b`, demonstrating the authenticated canonical Membership-based resolver on the deployed application.
- Final counts: Customers 51, BuyerProfiles 52, Leads/trade_ins 53, Cases 51. The three extra rows are the named synthetic runtime fixtures. Original manifest rows remain intact.
- Final rollback-only probes confirm NOT NULL rejects tenantless ownership on all four roots. There are zero tenantless roots and zero Case ownership mismatches. Both public routes are active, bound to the approved Tenant and have null Store.
- Customer and Case creation endpoints are not exposed in this slice; no successful creation flow is claimed for them. Their required ownership constraints were validated directly, and their existing pages load.

## Gate result

READY_TO_RESUME_AP-CRM-003D

All ten required minimum Preview/runtime conditions are satisfied within the tested public and authenticated paths. This result grants readiness only; AP-CRM-003D identity normalization, Negotiation persistence and AP-CRM-004 were not started. Production routing remains undefined and unchanged.
