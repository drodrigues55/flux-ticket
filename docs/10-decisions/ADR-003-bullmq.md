# ADR-003 — BullMQ as the Background Processing Engine

Status: Accepted

Date: 2026-06-19

Authors: Flux Tickets Team

---

# Context

Flux Tickets performs several operations that should not execute during the HTTP request lifecycle.

Examples include:

- Ticket issuance
- Payment recovery
- Waitlist invitations
- Notification delivery
- Analytics aggregation
- Offline synchronization

Executing these operations synchronously would increase API latency, reduce throughput and make failures more difficult to recover.

The platform therefore requires a reliable background processing engine.

---

# Decision

Flux Tickets adopts **BullMQ** as its background job system.

Redis acts as the queue backend while one or more Worker services consume jobs asynchronously.

Architecture:

```text
api-write

↓

OutboxEvent

↓

BullMQ Queue

↓

ticket-worker

↓

Business Execution
```

Each queue is isolated by responsibility.

---

# Current Queues

Current queues include:

```text
payments.webhook

payments.recoverPending

tickets.issue

waitlist.invite

analytics.aggregate

notifications.placeholder

carts.expireAbandoned

checkins.sync
```

Additional queues may be added without changing the overall architecture.

---

# Rationale

BullMQ provides:

- Delayed jobs
- Automatic retries
- Dead-letter support
- Repeatable jobs
- Concurrency control
- Horizontal scalability
- Redis-based persistence

These capabilities match the platform's operational requirements.

---

# Alternatives Considered

## RabbitMQ

Pros

- Extremely mature
- AMQP standard
- Excellent routing capabilities

Cons

- More operational complexity
- Additional infrastructure
- Unnecessary for current requirements

Rejected.

---

## Kafka

Pros

- High throughput
- Durable event streaming

Cons

- Significantly more complex
- Better suited for event streaming than background jobs

Rejected.

---

## Node.js Background Tasks

Pros

- Simple implementation

Cons

- No persistence
- Lost jobs on restart
- No retries
- No scaling

Rejected.

---

# Consequences

Positive

- Reliable asynchronous execution
- Independent worker scaling
- Retry support
- Delayed execution
- Operational visibility

Negative

- Redis dependency
- Additional worker service
- Queue monitoring required

These trade-offs are acceptable.

---

# Retry Strategy

Every queue supports retries.

General lifecycle:

```text
Waiting

↓

Active

↓

Completed
```

Failure path:

```text
Waiting

↓

Active

↓

Failed

↓

Retry

↓

Dead Letter
```

Retry policies are defined per queue.

---

# Monitoring

BullMQ metrics should include:

- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs
- Retry count
- Dead-letter count

Queue health forms part of platform observability.

---

# Future Considerations

Future improvements may include:

- Queue prioritization
- Dynamic concurrency
- Queue dashboards
- Scheduled jobs
- Rate limiting
- Multi-region workers

BullMQ remains compatible with these enhancements.

---

# Related Documents

- 02-architecture/queue_system.md
- 02-architecture/workers.md
- 06-devops/observability.md
- 07-testing/queue-validation.md

---
