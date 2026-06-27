# Financial Center Testing

Phase 12 tests should cover financial calculations, query validation, read-model redaction, CSV export fields, dashboard requestId error display, filters, pagination, and empty states.

## Required Checks

- `packages/types` validates financial query and export schemas.
- `api-read` validates fee estimates, status grouping, CSV escaping, and organizer-scoped endpoint behavior.
- `dashboard` validates finance query helpers, export URL generation, requestId propagation, and financial page rendering helpers.

## Manual QA

Open `/finance`, `/finance/events`, `/finance/payments`, and `/finance/exports`.

Confirm:

- Estimated labels are visible.
- Mock provider and real gateway limitations are visible.
- Payment ledger filters update the query.
- Pagination does not load all payments at once.
- CSV exports exclude sensitive payment payloads.
