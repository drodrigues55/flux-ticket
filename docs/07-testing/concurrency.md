# Concurrency

> Status: Active
> Last Updated: June 2026

---

# Overview

Concurrency testing validates that the transactional paths in Flux Tickets remain correct under parallel load.

The current implementation relies on a mix of Redis locks, PostgreSQL transactions, idempotent updates, and worker-side deduplication.

The code paths that matter most are in:

- `services/api-write/src/tickets/checkout.service.ts`
- `services/api-write/src/tickets/checkout.controller.ts`
- `services/ticket-worker/src/workers.ts`
- `packages/database/prisma/schema.prisma`

---

# What Must Be Proven

Concurrency tests should prove:

- inventory is not oversold
- a payment is approved once
- a ticket is issued once
- a webhook replay does not duplicate business effects
- a lock renewal does not create duplicate reservations
- a concurrent check-in cannot create multiple accepted records

---

# Critical Scenarios

## Checkout Reservation

Parallel checkout attempts for the same batch should:

- respect Redis reservation locks
- decrement inventory once
- create one valid ticket per successful reservation
- reject excess requests with a business error

## Payment Approval

Repeated approval processing for the same payment should:

- keep one canonical approved state
- avoid duplicate ticket issuance
- avoid duplicate history rows

## Webhook Replay

Repeated webhook delivery should not create duplicate payment transitions.

The worker must remain idempotent even when the provider sends the same payload multiple times.

## Offline Sync Conflict

When multiple devices submit the same ticket or check-in, the database must keep one authoritative result and reject duplicates.

---

# Relevant Code Paths

The checkout service already uses:

- Redis stock initialization
- reservation locks
- PostgreSQL transactions
- compensating lock release on failure

The worker already uses:

- row locking for payment handling
- status guards before updates
- dead-letter routing after retries are exhausted

These are the paths concurrency tests should target directly.

---

# Test Expectations

Each concurrency test should assert:

- final ticket count
- final inventory value
- final payment status
- final history count
- final audit log count when applicable

The expected result is stable business state, not merely a successful HTTP response.

