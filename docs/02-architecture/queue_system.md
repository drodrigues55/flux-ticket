# Queue System

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Queue System is responsible for executing asynchronous operations across the Flux Tickets platform.

Instead of executing every business operation inside an HTTP request, long-running and retryable tasks are delegated to BullMQ workers.

This keeps API latency low while guaranteeing reliable execution.

---

# Responsibilities

The Queue System is responsible for:

- Background processing
- Retry handling
- Dead-letter routing
- Payment recovery
- Ticket issuance
- Waitlist invitations
- Cart expiration
- Analytics aggregation
- Future notification delivery

Queues never contain business rules.

Business rules remain inside the application services.

---

# Design Principles

The Queue System follows these principles:

- Event-driven
- Idempotent
- Retry-safe
- Observable
- Horizontally scalable
- Provider independent

Workers may execute the same job multiple times without creating duplicate business effects.

---

# Architecture

```text
Business Transaction

↓

OutboxEvent

↓

BullMQ Queue

↓

Worker

↓

Business Service

↓

Database
```

Workers consume events only after the originating transaction has committed.

---

# Why Outbox?

Without the Outbox pattern:

```text
Payment Approved

↓

Issue Ticket

↓

Crash
```

could leave the system inconsistent.

With Outbox:

```text
Payment Approved

↓

OutboxEvent

↓

Commit

↓

Worker

↓

Issue Ticket
```

The event is never lost.

---

# BullMQ

BullMQ provides:

- Persistent queues
- Delayed jobs
- Retry policies
- Dead-letter routing
- Concurrency
- Scheduling

Redis acts as the transport layer.

---

# Queue Registry

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

Each queue owns a dedicated worker.

---

# Queue Naming

Queues follow the convention:

```text
domain.action
```

Examples:

```text
payments.recoverPending

waitlist.invite

tickets.issue
```

This keeps responsibilities explicit.

---

# Job Structure

Each job contains:

```text
jobId

requestId

payload

attempts

createdAt
```

Optional metadata:

```text
eventId

ticketId

paymentId

orderId
```

Jobs remain lightweight.

---

# Request Traceability

Every job inherits the originating request ID.

Flow:

```text
HTTP Request

↓

requestId

↓

Outbox

↓

Queue

↓

Worker

↓

Logs
```

This allows complete tracing across services.

---

# Job Lifecycle

```text
Waiting

↓

Active

↓

Completed
```

Alternative paths:

```text
Waiting

↓

Active

↓

Failed

↓

Retry
```

or:

```text
Failed

↓

Dead Letter
```

---

# Retry Policy

Default behavior:

```text
attempts = 5
```

Retry strategy:

```text
Exponential Backoff
```

Retry delays increase automatically.

---

# Idempotency

Workers must tolerate duplicate execution.

Example:

```text
Job Executes

↓

Crash Before ACK

↓

Job Executes Again
```

Business state must remain identical.

---

# Database Safety

Workers never assume that a job is the first execution.

Typical worker flow:

```text
Acquire Lock

↓

Reload Entity

↓

Already Processed?

↓

Yes

↓

Exit
```

This guarantees safe retries.

---

# Queue Isolation

Each queue owns a single responsibility.

Examples:

`payments.recoverPending`

Only payment reconciliation.

Never:

- notifications
- analytics
- ticket issuance

Those belong to different queues.

---

# Current Queue Responsibilities

## payments.webhook

Processes normalized provider webhook events.

Typical flow:

```text
Webhook

↓

Normalize

↓

Business Transaction
```

---

## payments.recoverPending

Reconciles pending payments.

Flow:

```text
Pending Payment

↓

Provider Lookup

↓

Business Update
```

---

## tickets.issue

Issues tickets after successful payment.

Flow:

```text
Payment Approved

↓

Create Ticket

↓

History

↓

Audit
```

Ticket issuance remains asynchronous.

---

## checkins.sync

Processes offline check-in synchronization.

Responsibilities:

- conflict detection
- accepted check-ins
- audit generation
- history updates

---

## analytics.aggregate

Reserved for future dashboard optimization.

Possible responsibilities:

- sales aggregation
- daily metrics
- occupancy
- revenue summaries

---

## halfPrice.validateDeadline

Validates student discount deadlines.

Current implementation is independent of payment processing.

---

## waitlist.invite

Processes inventory returns.

Flow:

```text
Inventory Available

↓

Invite Customer

↓

Expire Invitation
```

---

## carts.expireAbandoned

Handles expired reservations.

Flow:

```text
Reservation Timeout

↓

Release Inventory

↓

Waitlist
```

---

## notifications.placeholder

Current placeholder queue.

Future providers include:

- Email
- SMS
- WhatsApp
- Push Notifications

No business code depends on the notification provider.

---

# Dead-Letter Queues

Every queue has a corresponding dead-letter queue.

Example:

```text
payments.webhook

↓

payments.webhook.dead
```

Dead-letter jobs remain available for inspection and replay.

---

# Monitoring

Queue health is exposed through:

```http
GET /monitoring/queues
```

Returned information includes:

- waiting
- active
- delayed
- completed
- failed
- dead-letter

This endpoint is intended for operational monitoring.

---

# Worker Scaling

Workers can be scaled horizontally.

Example:

```text
ticket-worker ×5
```

All instances safely consume from the same queues using BullMQ's coordination mechanisms.

---

# Failure Recovery

If a worker crashes during processing:

```text
Job

↓

Crash

↓

Redis Lock Expires

↓

Job Requeued
```

Another worker may safely continue processing.

---

# Queue System Principles

The Queue System guarantees:

- reliable execution
- retry safety
- exactly-once business effects
- observable processing
- horizontal scalability

Asynchronous execution is treated as an extension of the transactional business layer rather than a separate subsystem.

---

# Next Section

Part 2 documents:

- Worker architecture
- Queue concurrency
- Dead-letter replay
- Scheduling
- Monitoring
- Operational metrics
- Failure scenarios
- Future queue roadmap

---
---

# Repository Structure

Flux Tickets is organized as a monorepo.

Every application and service lives in a dedicated workspace while sharing common packages.

Current high-level structure:

```text
apps/

packages/

services/

scripts/
```

This organization minimizes code duplication while keeping business responsibilities isolated.

---

# Applications

```text
apps/

├── client
├── dashboard
└── staff-pwa
```

Each application owns its UI.

Business logic remains in backend services.

---

## apps/client

Responsibilities:

- Event catalog
- Checkout
- Consumer tickets
- Order history
- Payment experience

Consumes:

```text
api-read

api-write
```

---

## apps/dashboard

Responsibilities:

- Organizer management
- Analytics
- Operational monitoring
- Event administration

Consumes:

```text
api-read
```

Business calculations are never performed inside React components.

---

## apps/staff-pwa

Responsibilities:

- Offline validation
- QR scanning
- Local synchronization
- Operational check-ins

Uses:

- IndexedDB
- Service Worker
- Offline Bundle

---

# Services

```text
services/

├── api-read
├── api-write
└── ticket-worker
```

Each service has independent responsibilities.

---

## api-read

Characteristics:

- Stateless
- Read-only
- No business mutations
- Cache-friendly

Typical endpoints:

```text
/events

/dashboard

/staff/events/:id/offline-bundle
```

---

## api-write

Characteristics:

- Transactional
- Business rules
- Payment orchestration
- Ticket lifecycle

Typical endpoints:

```text
/reservations

/payments

/staff/checkins/sync
```

---

## ticket-worker

Characteristics:

- No HTTP interface
- Queue consumer
- Background processing
- Retry-safe

Consumes:

```text
BullMQ

OutboxEvent
```

---

# Shared Packages

Current shared packages:

```text
packages/database

packages/types

packages/shared
```

Future packages may include:

```text
packages/ui

packages/config

packages/testing
```

---

## packages/database

Contains:

- Prisma schema
- Migrations
- Prisma client
- Database utilities

Every service imports the same database package.

---

## packages/types

Contains shared TypeScript types.

Examples:

- DTOs
- Enums
- API Contracts
- Shared interfaces

Frontend and backend always consume identical types.

---

## packages/shared

Reserved for reusable business utilities.

Examples:

- helpers
- validators
- formatting
- crypto helpers

No service-specific code belongs here.

---

# Scripts

```text
scripts/
```

Contains:

- smoke tests
- validation scripts
- migration helpers
- maintenance scripts

Scripts are disposable and never contain business logic.

---

# Dependency Direction

The dependency graph should always flow downward.

```text
Apps

↓

Services

↓

Packages

↓

Database
```

Never:

```text
Database

↓

Services

↓

Apps
```

---

# Service Lifecycle

Every request follows the same lifecycle.

```text
HTTP Request

↓

Middleware

↓

Authentication

↓

Controller

↓

Service

↓

Database

↓

Response
```

Asynchronous work is delegated after commit.

---

# Worker Lifecycle

Worker execution follows:

```text
Queue

↓

Worker

↓

Business Service

↓

Database

↓

Outbox

↓

Completion
```

Workers should never communicate directly with frontend applications.

---

# Deployment Topology

Current logical deployment:

```text
Internet

↓

Reverse Proxy

↓

api-read

api-write

↓

PostgreSQL

Redis

↓

ticket-worker
```

Applications are deployed independently.

---

# Horizontal Scaling

Services scale independently.

Examples:

Heavy traffic:

```text
api-read ×5
```

Large events:

```text
ticket-worker ×10
```

Checkout load:

```text
api-write ×3
```

Scaling one service should not require scaling the others.

---

# Failure Isolation

Each service should fail independently.

Example:

```text
ticket-worker offline
```

Effects:

- Checkout still works
- Dashboard still loads
- Staff validation still functions
- Background jobs pause

The platform degrades gracefully.

---

# Recovery Strategy

Recovery follows:

```text
Failure

↓

Retry

↓

Dead Letter

↓

Manual Investigation

↓

Replay
```

Every asynchronous operation should be recoverable.

---

# Configuration Management

Configuration is externalized through environment variables.

Examples:

```text
DATABASE_URL

REDIS_URL

JWT_SECRET

HMAC_SECRET

SENTRY_DSN

PROMETHEUS_ENABLED
```

No runtime configuration should be hardcoded.

---

# Build Strategy

Each workspace builds independently.

Examples:

```bash
npm run build --workspace @flux/api-read

npm run build --workspace @flux/api-write

npm run build --workspace @flux/ticket-worker

npm run build --workspace @flux/dashboard

npm run build --workspace @flux/client
```

Independent builds simplify CI/CD pipelines.

---

# Testing Strategy

Testing occurs at multiple levels.

```text
Unit Tests

↓

Integration Tests

↓

Smoke Tests

↓

Concurrency Tests

↓

Queue Validation

↓

Production Validation
```

Each layer validates a different concern.

---

# Future Evolution

The current architecture allows extracting dedicated services without changing application behavior.

Possible future services:

```text
analytics-service

notification-service

financial-service

admin-service

marketing-service

public-api
```

Because communication already occurs through explicit APIs and asynchronous events, service extraction becomes an infrastructure decision rather than an architectural rewrite.

---

# Architecture Principles

The Flux Tickets architecture is designed to remain:

- modular
- maintainable
- observable
- horizontally scalable
- provider independent
- event driven
- domain oriented

As the platform grows, new applications and services should integrate by consuming existing contracts instead of bypassing established boundaries.

---

# Architecture Complete

Together, Parts 1 and 2 describe the complete system architecture, repository organization, service boundaries, deployment model, and scalability strategy that guide every component of the Flux Tickets platform.

---
