# Queue Validation

> Status: Active
> Last Updated: June 2026

---

# Overview

Queue validation verifies the asynchronous execution model used by the worker process.

The current queue definitions and worker behavior live in:

- `services/ticket-worker/src/queue-registry.ts`
- `services/ticket-worker/src/workers.ts`
- `services/ticket-worker/src/dead-letter.ts`
- `services/ticket-worker/src/outbox-publisher.ts`

---

# Queue Lifecycle

Every registered queue should prove the full lifecycle:

```text
Enqueue
↓
Consume
↓
Retry
↓
Dead Letter
↓
Completed
```

If a queue cannot complete that sequence in a disposable environment, it is not fully validated.

---

# Current Queues

The worker currently accepts queues such as:

- `payments.webhook`
- `payments.recoverPending`
- `tickets.issue`
- `halfPrice.validateDeadline`
- `carts.expireAbandoned`
- `waitlist.invite`
- `notifications.placeholder`
- `checkins.sync`
- `analytics.aggregate`

Validation should be written against the actual queue names exposed by the registry.

---

# Dead Letter Behavior

The worker moves failed jobs to dead-letter queues after configured attempts are exhausted.

Queue validation must verify:

- the failed job is captured
- the original queue name is preserved
- the dead-letter payload retains enough context to investigate or re-enqueue manually
- the retry path does not silently swallow errors

---

# Outbox Delivery

The outbox publisher is part of the queue model and must be validated too.

Tests should confirm:

- pending outbox events are picked up
- events are mapped to the correct queue
- delivery failures are tracked
- exhausted retries land in dead-letter storage

---

# Practical Checks

Queue validation should assert:

- job payload integrity
- requestId propagation
- retry count behavior
- dead-letter placement
- worker shutdown cleanup
- traceability in logs

The goal is operational confidence, not just queue consumption.

