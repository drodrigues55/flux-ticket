# Financial Read Models

Financial Center read models are served by `api-read` under `/organizer/finance`.

## Boundaries

- Reads are organizer scoped through authenticated organizer identity.
- Financial dashboard pages call dashboard proxy routes, which forward to `api-read`.
- Payment behavior remains in `api-write` and the worker; Phase 12 does not change payment lifecycle or ticket issuance.
- CSV exports are generated from server-side read queries, not frontend assembled data.

## Sensitive Data

Organizer finance models do not expose raw provider payloads, card tokens, CPF values, or payment debug payloads. Internal debug read models remain separate from organizer finance.

## Endpoints

- `GET /organizer/finance/overview`
- `GET /organizer/finance/events`
- `GET /organizer/finance/events/:eventId`
- `GET /organizer/finance/payments`
- `GET /organizer/finance/exports/payments.csv`
- `GET /organizer/finance/exports/events/:eventId.csv`
