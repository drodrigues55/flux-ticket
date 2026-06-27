# MVP Test Plan - Quality Assurance

This document outlines the testing strategy, automated test coverage matrix, and validation execution commands across the monorepo.

## Test Runner Configuration

| Project / Service | Test Runner | Execution Command |
| ----------------- | ----------- | ----------------- |
| `@flux/types`     | tsx --test  | `npm run test -w @flux/types` |
| `@flux/api-write` | tsx --test  | `npm run test -w @flux/api-write` |
| `@flux/api-read`  | tsx --test  | `npm run test -w @flux/api-read` |
| `@flux/ticket-worker` | tsc & tsx --test | `npm run test -w @flux/ticket-worker` |
| `@flux/client`    | tsx --test  | `npm run test -w @flux/client` |
| `@flux/dashboard` | tsx --test  | `npm run test -w @flux/dashboard` |
| `@flux/staff-pwa` | tsx --test  | `npm run test -w @flux/staff-pwa` |

## Test Coverage Matrix (Phases 1-10)

1. **Core Infrastructure**: Health, live, outbox events, BullMQ queues, request correlation logging.
2. **Foundation QA**: Wizard state progression, form validation rules.
3. **Event Creation Flow**: Draft creation, ready-for-validation requirements.
4. **Organizer Portal**: Listings, scope filters, soft-archiving, duplications.
5. **Ticket Workspace**: Ticket type rules, capacity updates.
6. **Batch Management UI**: Inventory allocations, reordering, window constraints.
7. **Publishing Workflow**: Blocker checks, publish/unpublish.
8. **Consumer Portal**: Public catalogs, reservations, inventory locking.
9. **Staff Portal**: Gate validation, signature comparisons, offline queues.
10. **Ticket Delivery MVP**: Delivery outbox events, resending, and printable views.

---

## QA-2 Updates: Cross-Service Coverage
- **Contract Tests**: Added Zod schema validations for event dates, ticket prices, purchase limits, and QR payloads in `@flux/types`.
- **Express Read Model Tests**: Verify scope boundaries and customer data sanitization inside `@flux/api-read`.
- **Worker Idempotency Tests**: Added retryability and duplicate email checks inside `@flux/ticket-worker`.
- **Frontend Error Handlers**: Mock components and error bounds tests added to `dashboard`, `client`, and `staff-pwa`.
- **Integration Smoke Tests**: Added full checkout E2E loops and offline conflict simulations to `@flux/api-write`.
