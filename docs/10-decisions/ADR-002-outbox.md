# ADR-002 — Transactional Outbox Pattern

Status: Accepted

Date: 2026-06-19

Authors: Flux Tickets Team

---

# Context

Flux Tickets performs several business operations that require asynchronous processing after a successful database transaction.

Examples include:

- Ticket issuance
- Notification dispatch
- Payment recovery
- Analytics aggregation
- Waitlist invitations
- Offline synchronization

Publishing queue jobs directly inside business transactions introduces consistency problems.

Example:

```text
Create Order

↓

Publish Queue

↓

Database Rollback
```

The worker would process an order that never actually existed.

The opposite failure is also possible.

```text
Commit Database

↓

Queue Publish Fails
```

The business transaction succeeds but the asynchronous task is permanently lost.

Neither scenario is acceptable.

---

# Decision

Flux Tickets adopts the **Transactional Outbox Pattern**.

Every asynchronous operation is first persisted as an OutboxEvent inside the same database transaction.

Flow:

```text
Business Transaction

↓

OutboxEvent

↓

Database Commit

↓

Worker Publisher

↓

BullMQ Queue
```

Only committed transactions produce queue events.

---

# Rationale

The Outbox Pattern guarantees:

- Atomic persistence
- Reliable asynchronous execution
- No lost events
- No phantom jobs
- Replay capability
- Better observability

It also simplifies debugging because every queued action originates from a persisted database record.

---

# Alternatives Considered

## Publish Directly to BullMQ

Pros

- Simple implementation
- Fewer database writes

Cons

- Lost jobs
- Phantom jobs
- Distributed transaction problem

Rejected.

---

## Two-Phase Commit

Pros

- Strong consistency

Cons

- High complexity
- Poor scalability
- Difficult operational support

Rejected.

---

## Event Sourcing

Pros

- Complete event history

Cons

- Significantly more complex
- Different architectural model
- Not required for current business needs

Rejected.

---

# Consequences

Positive

- Reliable asynchronous processing
- Easier recovery
- Replay support
- Better monitoring
- Deterministic queue publishing

Negative

- Additional database table
- Background publisher required
- Slightly increased implementation complexity

These costs are outweighed by the consistency guarantees.

---

# Operational Flow

The Outbox Publisher continuously scans pending events.

```text
OutboxEvent

↓

Publish

↓

BullMQ

↓

Mark Published
```

If publishing fails:

```text
Retry

↓

Dead Letter (if necessary)
```

No committed business event is silently discarded.

---

# Future Considerations

Future services should continue publishing asynchronous work exclusively through the Outbox.

Direct queue publication from business services should be avoided to preserve transactional consistency.

---

# Related Documents

- 02-architecture/queue_system.md
- 02-architecture/workers.md
- 03-backend/queues.md
- 03-backend/api_write.md
- 07-testing/queue-validation.md

---
