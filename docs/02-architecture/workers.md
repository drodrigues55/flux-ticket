# Workers

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Ticket Worker is the asynchronous execution engine of the Flux Tickets platform.

While `api-write` is responsible for synchronous business transactions, the Ticket Worker processes every operation that can safely occur after the original transaction has committed.

This architecture keeps API latency low while ensuring reliable execution through BullMQ.

---

# Responsibilities

The Ticket Worker is responsible for:

- Payment recovery
- Ticket issuance
- Waitlist invitations
- Reservation expiration
- Notification dispatch
- Offline synchronization
- Future analytics aggregation
- Future financial settlement

Workers never expose HTTP endpoints.

---

# Architecture

```text
HTTP Request

↓

api-write

↓

Database Transaction

↓

OutboxEvent

↓

BullMQ

↓

Ticket Worker

↓

Business Service

↓

Database
```

Every asynchronous action begins with an OutboxEvent.

---

# Worker Philosophy

Workers must always be:

- Stateless
- Idempotent
- Retry-safe
- Deterministic
- Horizontally scalable

No worker should rely on process memory.

---

# Project Structure

```text
services/

ticket-worker/

src/

index.ts

workers.ts

queue-registry.ts

outbox-publisher.ts

logger.ts

sentry.ts

redis.ts
```

Each file owns a specific responsibility.

---

# index.ts

Application bootstrap.

Responsibilities:

- Load configuration
- Initialize Redis
- Register queues
- Register workers
- Initialize Sentry
- Initialize logging
- Handle graceful shutdown

Business logic never belongs here.

---

# workers.ts

Registers BullMQ workers.

Responsibilities:

- Queue listeners
- Job dispatch
- Error handling
- Retry callbacks

Business rules are delegated to services.

---

# queue-registry.ts

Defines every queue available in the platform.

Current queues:

```text
payments.webhook

payments.recoverPending

tickets.issue

checkins.sync

analytics.aggregate

halfPrice.validateDeadline

waitlist.invite

carts.expireAbandoned

notifications.placeholder
```

Queue names remain centralized.

---

# outbox-publisher.ts

Consumes pending OutboxEvents.

Flow:

```text
Pending Event

↓

Publish Queue Job

↓

Mark Processed
```

This bridges the transactional database with BullMQ.

---

# logger.ts

Creates the shared Pino logger.

Common fields include:

```text
requestId

queueName

jobId

duration

service
```

Sensitive fields are automatically redacted.

---

# sentry.ts

Optional Sentry initialization.

Captures:

- worker exceptions
- rejected promises
- dead-letter failures

Initialization is skipped when no DSN is configured.

---

# redis.ts

Creates the shared Redis connection.

Responsibilities:

- BullMQ backend
- Distributed locks
- Queue events

Redis connection errors are routed through structured logging.

---

# Worker Registration

Each queue owns exactly one worker.

Example:

```text
payments.recoverPending

↓

Recovery Worker
```

Multiple workers may consume the same queue horizontally.

---

# Job Flow

```text
Receive Job

↓

Validate Payload

↓

Acquire Lock

↓

Reload Database State

↓

Execute Service

↓

Commit

↓

Acknowledge
```

Workers never trust payload state alone.

---

# Service Delegation

Workers should call business services instead of implementing business rules.

Correct:

```text
Worker

↓

PaymentsService
```

Incorrect:

```text
Worker

↓

Prisma

↓

Business Logic
```

Business logic remains centralized.

---

# Database Access

Workers reload every entity before processing.

Example:

```text
paymentId

↓

Database

↓

Payment

↓

Business Decision
```

Payloads never contain full business objects.

---

# Current Worker Responsibilities

## Payment Recovery

Queue:

```text
payments.recoverPending
```

Responsibilities:

- query provider
- update payment
- publish outbox
- prevent duplicate approval

---

## Ticket Issuance

Queue:

```text
tickets.issue
```

Responsibilities:

- create ticket
- generate signature
- create history
- publish notifications

---

## Waitlist

Queue:

```text
waitlist.invite
```

Responsibilities:

- detect inventory
- invite customers
- expire invitations

---

## Reservation Expiration

Queue:

```text
carts.expireAbandoned
```

Responsibilities:

- expire reservations
- restore inventory
- notify waitlist

---

## Offline Synchronization

Queue:

```text
checkins.sync
```

Responsibilities:

- import offline validations
- detect conflicts
- write accepted check-ins

---

## Analytics

Reserved queue:

```text
analytics.aggregate
```

Future responsibilities:

- dashboard metrics
- daily aggregation
- revenue summaries

---

## Notifications

Current placeholder:

```text
notifications.placeholder
```

Future providers:

- Email
- SMS
- WhatsApp
- Push

Workers remain provider-independent.

---

# Concurrency

Workers execute concurrently.

Example:

```text
Worker A

↓

Job 101
```

```text
Worker B

↓

Job 102
```

Distributed locks prevent duplicate business effects.

---

# Idempotency

Workers assume jobs may execute multiple times.

Possible causes:

- retry
- worker crash
- Redis reconnect
- duplicate webhook
- provider retry

Every operation must produce the same final state regardless of execution count.

---

# Retry Strategy

Temporary failures:

```text
Retry

↓

Retry

↓

Retry
```

Permanent failures:

```text
Dead Letter
```

Retries never bypass business validation.

---

# Error Handling

Workers classify failures into:

Business:

```text
Already Approved

Already Issued

Already Processed
```

Infrastructure:

```text
Redis

Database

Network
```

Provider:

```text
Gateway Timeout

Rate Limit

Temporary Failure
```

Only retryable errors are retried.

---

# Dead-Letter

Failed jobs eventually move to:

```text
queue.dead
```

Dead-letter payload includes:

- requestId
- jobId
- attempts
- queueName
- error message

Jobs remain available for replay.

---

# Replay

Replay flow:

```text
Dead Letter

↓

Operator Review

↓

Replay

↓

Original Queue
```

Replay remains safe because workers are idempotent.

---

# Monitoring

Workers expose operational information through:

```text
GET /monitoring/queues
```

Information includes:

- waiting
- active
- delayed
- completed
- failed
- dead-letter

---

# Observability

Every execution produces:

- structured logs
- requestId
- duration
- queueName
- jobId

Optional Sentry captures unexpected failures.

---

# Graceful Shutdown

Shutdown sequence:

```text
Stop Receiving Jobs

↓

Finish Active Jobs

↓

Close Redis

↓

Exit
```

Workers never terminate during active database transactions.

---

# Future Workers

Planned workers include:

```text
financial.settlement

financial.reconciliation

ticket.rotateQr

ticket.transfer

notifications.email

notifications.sms

marketing.dispatch

analytics.dailyRollup
```

These integrate without changing the worker architecture.

---

# Worker Principles

The Worker Service guarantees:

- deterministic execution
- idempotent processing
- observable failures
- retry-safe operations
- horizontal scalability
- provider independence

It serves as the asynchronous execution backbone of the entire Flux Tickets platform.

---

# Next Section

Part 2 documents:

- Queue lifecycle
- Worker lifecycle
- Scheduling
- Scaling
- Failure recovery
- Testing strategy
- Operational recommendations
- Future worker roadmap

---
---

# Queue Lifecycle

Every worker executes jobs using the same lifecycle.

```text
Job Created

↓

Waiting

↓

Active

↓

Completed
```

Alternative execution:

```text
Waiting

↓

Active

↓

Failed

↓

Retry

↓

Completed
```

Or:

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

Every transition is deterministic.

---

# Worker Lifecycle

Each worker follows the same internal execution flow.

```text
Receive Job

↓

Validate Payload

↓

Acquire Distributed Lock

↓

Reload Database State

↓

Execute Business Service

↓

Commit Transaction

↓

Acknowledge Job
```

Workers never execute directly against stale payload data.

---

# Distributed Locks

Critical jobs acquire Redis-based locks before mutating state.

Current lock categories include:

```text
Payment Approval

Ticket Issuance

Offline Check-in Sync
```

Future lock categories may include:

```text
Settlement

Refund

QR Rotation
```

Locks prevent duplicate execution across multiple worker instances.

---

# Scheduling

Some jobs execute immediately.

Examples:

```text
tickets.issue

payments.webhook
```

Others are scheduled.

Examples:

```text
payments.recoverPending

carts.expireAbandoned

halfPrice.validateDeadline
```

Scheduling intervals remain configurable through application settings.

---

# Delayed Jobs

BullMQ supports delayed execution.

Typical use cases:

```text
Reservation Expiration

↓

10 Minutes

↓

Expire Cart
```

or

```text
Waitlist Invitation

↓

Inventory Released

↓

Invite Customer
```

Delayed jobs avoid unnecessary polling.

---

# Job Priorities

Current implementation processes queues independently.

Future versions may introduce priorities.

Example:

High:

```text
tickets.issue
```

Medium:

```text
payments.recoverPending
```

Low:

```text
analytics.aggregate
```

Priority affects execution order, not business behavior.

---

# Worker Scaling

Workers are designed for horizontal scaling.

Example deployment:

```text
ticket-worker-1

ticket-worker-2

ticket-worker-3

ticket-worker-4
```

BullMQ coordinates job ownership automatically.

No custom leader election is required.

---

# Failure Isolation

Worker failures do not interrupt API traffic.

Example:

```text
Worker Offline

↓

Checkout Still Works

↓

Outbox Accumulates

↓

Worker Returns

↓

Processing Resumes
```

The platform degrades gracefully.

---

# Recovery After Crash

If a worker crashes during processing:

```text
Job Active

↓

Worker Crash

↓

Redis Lock Timeout

↓

Job Requeued

↓

Another Worker Executes
```

Business consistency is preserved through idempotent services.

---

# Queue Throughput

Queues should remain short.

Recommended behavior:

```text
Fast Jobs

↓

Few Seconds

↓

Completion
```

Long-running business processes should be decomposed into multiple smaller jobs.

---

# Resource Usage

Workers should minimize:

- database round trips
- Redis operations
- payload size
- memory allocation

Jobs should be lightweight and reload only the data they require.

---

# Logging Strategy

Each execution produces structured logs.

Common fields:

```text
service

queueName

jobId

requestId

duration

attempt

status
```

Logs should support end-to-end tracing.

---

# Metrics

Operational metrics include:

```text
Jobs Waiting

Jobs Active

Jobs Completed

Jobs Failed

Retry Count

Dead-Letter Count

Average Duration
```

These metrics are exposed through the monitoring endpoints.

---

# Health Monitoring

Worker health is determined by:

- Redis connectivity
- Queue availability
- Worker heartbeat
- Dead-letter growth

Large dead-letter queues indicate operational issues requiring investigation.

---

# Testing Strategy

Every queue should be validated using the same sequence.

```text
Enqueue

↓

Consume

↓

Retry

↓

Dead Letter

↓

Replay

↓

Completed
```

Validation should prove both functional correctness and operational resilience.

---

# Concurrency Testing

Workers must pass concurrent execution tests.

Typical scenarios include:

```text
10 Parallel Jobs

25 Parallel Jobs

50 Parallel Jobs
```

Expected outcome:

- no duplicate business effects
- no duplicate history entries
- no duplicate ticket issuance
- no duplicate check-ins

---

# Production Recommendations

Recommended deployment:

```text
api-read

↓

Multiple Instances
```

```text
api-write

↓

Multiple Instances
```

```text
ticket-worker

↓

Independent Autoscaling
```

This allows asynchronous capacity to grow independently of HTTP traffic.

---

# Future Worker Responsibilities

As the platform evolves, workers will additionally process:

- financial settlements
- chargeback reconciliation
- notification delivery
- QR rotation
- ticket transfer
- analytics rollups
- marketing campaign dispatch
- fraud detection

The current architecture already supports these additions.

---

# Operational Principles

Workers should always remain:

- stateless
- deterministic
- idempotent
- observable
- horizontally scalable

Every retry must be safe.

Every replay must be safe.

Every crash must be recoverable.

---

# Workers Complete

Together, Parts 1 and 2 define the complete asynchronous execution model of the Flux Tickets platform, including worker architecture, queue processing, scheduling, retries, monitoring, scaling, observability, and future extensibility.

---
