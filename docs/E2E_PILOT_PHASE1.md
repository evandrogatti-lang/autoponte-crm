# AutoPonte E2E Pilot — Phase 1

Executed against the configured staging database on 2026-08-25. All records use the
stable `pilot-p1-*` namespace and the runner is idempotent.

| Case | Acquisition | Vehicle | Operational distinction | Outcome |
|---|---|---|---|---|
| P1-01 | Direct purchase | Toyota Corolla XEi 2022 | Preparation, financing | Sold/delivered |
| P1-02 | Trade-in | Honda HR-V EXL 2021 | Maintenance, mixed payment | Sold/delivered |
| P1-03 | Consignment | Jeep Compass Longitude 2023 | Preparation, financing | Negotiation lost |
| P1-04 | Appraisal only | Volkswagen T-Cross Comfortline 2020 | Documents pending, no publication | Appraisal completed |
| P1-05 | Direct purchase | Chevrolet Onix Premier 2022 | Repair, cash | Sold/delivered |
| P1-06 | Consignment | BMW 320i GP 2021 | Financing proposal | Proposal rejected |
| P1-07 | Trade-in | Fiat Toro Volcano 2022 | Maintenance, mixed payment | Sold/delivered |
| P1-08 | Direct purchase | Hyundai Creta Platinum 2023 | Preparation, financing | Active negotiation |
| P1-09 | Consignment | Nissan Kicks Exclusive 2022 | Price-sensitive cash buyer | Negotiation lost |
| P1-10 | Trade-in | Ford Ranger Limited 2021 | Repair blocked by documents | Awaiting documents |

## Reproduction and validation

```powershell
node --env-file=.env.staging.local scripts/e2e-pilot-phase1.mjs
node --env-file=.env.staging.local scripts/validate-e2e-pilot-phase1.mjs
```

The validator requires exactly 10 cases, no broken vehicle/customer/opportunity/seller
links, a scored and explained candidate with a final outcome for every case, and a
signed contract plus completed delivery for every successful sale.

## Structural findings

The pre-pilot model could intake trade-ins and consignments, register inventory,
create basic buyer matches, and assign sellers. It could not persist the complete
commercial and vehicle lifecycle. Migration 0017 adds the minimum additive spine:
canonical customers and cases, lifecycle events, itemized costs, work orders, media,
publications, price history, structured intent, inventory-backed Match relationships
and interactions, proposals, contracts, payments, delivery, and post-sale follow-up.

Existing UI routes do not yet expose all new records. Phase 1 data is operationally
complete and queryable, but dedicated screens/actions for work orders, publication,
proposal terms, contract/payment, delivery, and the unified case timeline remain the
next product increment.
