# API_WRITE

> Version: 2.0  
> Last Updated: June 2026

---

# Overview

`api-write` is the transactional service of the Flux Tickets platform.

Every operation that changes business state is executed through this service.

Unlike `api-read`, which only exposes read models, `api-write` owns every business transaction and guarantees consistency through database transactions, distributed locks, idempotency, and asynchronous event publishing.

---

# Responsibilities

`api-write` is responsible for:

- Authentication
- Authorization
- Reservations
- Checkout
- Payments
- Webhook processing
- Ticket issuance requests
- Waitlists
- Offline check-in synchronization
- Administrative mutations
- Outbox creation
- Audit generation

No frontend application communicates directly with the database.

---

# Architecture

```text
Client

↓

api-write

↓

Business Service

↓

Prisma

↓

PostgreSQL

↓

Outbox

↓

Worker
```

Business transactions always originate from this service.

---

# Design Principles

The service follows these principles:

- Transactional consistency
- Backend as the source of truth
- Stateless execution
- Idempotency
- Explicit business rules
- Provider independence
- Observable execution

---

# Authentication

Authentication uses JWT.

Flow:

```text
Login

↓

JWT

↓

Authorization Header

↓

api-write
```

Every authenticated request resolves the current user before executing business logic.

---

# Authorization

Role-Based Access Control (RBAC) protects all write operations.

Current roles include:

```text
ADMIN

ORGANIZER

STAFF

CUSTOMER
```

Permissions are validated before entering the service layer.

---

# Request Lifecycle

Every request follows the same pipeline.

```text
HTTP Request

↓

Request ID

↓

Authentication

↓

Authorization

↓

Validation

↓

Controller

↓

Business Service

↓

Transaction

↓

Outbox

↓

Response
```

---

# Controllers

Controllers are intentionally lightweight.

Responsibilities:

- Parse input
- Validate DTOs
- Call services
- Return standardized responses

Controllers never implement business rules.

---

# Business Services

Business services contain all domain logic.

Examples:

```text
ReservationsService

PaymentsService

TicketsService

StaffService

DashboardService (read-side exception)
```

Each service owns a specific business domain.

---

# Database Transactions

Every business mutation executes inside a database transaction.

Example:

```text
Reserve Inventory

↓

Create Order

↓

Create Payment

↓

Create Audit

↓

Create Outbox

↓

Commit
```

If any step fails, the entire transaction is rolled back.

---

# Outbox Integration

Business services never enqueue jobs directly.

Instead:

```text
Business Transaction

↓

OutboxEvent

↓

Commit

↓

Worker
```

This guarantees reliable asynchronous execution.

---

# Request ID

Every request receives a unique identifier.

The Request ID is propagated through:

- API logs
- AuditLog
- OutboxEvent
- Queue jobs
- Worker logs

This enables complete request tracing across the platform.

---

# Standard Response Envelope

Successful responses follow the Phase 1 contract.

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

---

# Error Envelope

Errors always follow a standardized format.

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "statusCode": 400,
    "requestId": "...",
    "details": {}
  }
}
```

Stack traces are never exposed to clients.

---

# Validation

Input validation occurs before business execution.

Validation includes:

- DTO validation
- Business validation
- Entity existence
- Authorization
- State transitions

Invalid requests never reach the transaction layer.

---

# Idempotency

Critical operations are idempotent.

Examples:

- Payment approval
- Ticket issuance
- Webhook processing
- Offline synchronization

Duplicate requests produce the same final business state.

---

# Distributed Locks

Critical write operations acquire Redis locks.

Examples:

```text
Payment Approval

↓

Redis Lock
```

```text
Ticket Issuance

↓

Redis Lock
```

Locks prevent duplicate execution under concurrency.

---

# Observability

The service exposes:

```http
GET /health/live

GET /health/ready

GET /version

GET /metrics
```

Operational monitoring is documented in `OBSERVABILITY.md`.

---

# Logging

Structured Pino logging records:

- requestId
- route
- method
- statusCode
- latency
- authenticated user
- organizer

Sensitive values are automatically redacted.

---

# Sentry

Optional Sentry integration captures:

- unhandled exceptions
- rejected promises
- unexpected runtime failures

Business validation errors are not reported.

---

# Environment Variables

Primary configuration includes:

```text
DATABASE_URL

REDIS_URL

JWT_SECRET

HMAC_SECRET

LOG_LEVEL

SENTRY_DSN

PROMETHEUS_ENABLED

SERVICE_VERSION

GIT_COMMIT
```

Secrets must never be committed to source control.

---

# Current Domains

`api-write` currently owns:

- Identity
- Reservations
- Checkout
- Payments
- Ticket Engine
- Staff Synchronization
- Waitlists
- Audit
- Outbox

Future domains may include:

- Finance
- Marketing
- Notifications
- Administrative Platform

---

# Next Section

Part 2 documents:

- Endpoint organization
- Business modules
- Service boundaries
- Error handling
- Performance guidelines
- Scalability
- Future evolution

---
---

# Endpoint Organization

Endpoints are grouped by business domain rather than by database entity.

Current organization:

```text
/auth

/events

/reservations

/orders

/payments

/tickets

/staff

/dashboard (read-side proxy only)

/health

/monitoring
```

Each domain owns its own controllers and services.

---

# Reservation Module

Responsibilities:

- inventory reservation
- reservation expiration
- reservation validation
- checkout preparation

Typical flow:

```text
Reserve Inventory

↓

Reservation Created

↓

Checkout
```

Reservations are temporary and expire automatically.

---

# Checkout Module

Responsibilities:

- validate reservation
- create order
- initialize payment
- invoke `PaymentProvider`

The Checkout module never confirms payments.

Confirmation belongs to the Payment Engine.

---

# Payment Module

Responsibilities:

- payment creation
- webhook ingestion
- payment recovery coordination
- provider normalization

Business services depend only on the `PaymentProvider` interface.

Concrete providers remain interchangeable.

---

# Ticket Module

Responsibilities:

- ticket issuance requests
- QR generation
- HMAC signatures
- ticket lifecycle
- ticket revocation (future)

Ticket issuance is asynchronous through the Outbox pattern.

---

# Staff Module

Responsibilities:

- offline synchronization
- check-in validation
- conflict detection
- accepted check-ins

Only successful validations create `Checkin` records.

Rejected attempts generate only `AuditLog` entries.

---

# Waitlist Module

Responsibilities:

- waitlist registration
- invitation generation
- inventory recovery

Flow:

```text
Sold Out

↓

Join Waitlist

↓

Inventory Returns

↓

Invite Customer
```

The waitlist never reserves inventory automatically.

---

# Audit Module

Every important business mutation generates:

```text
AuditLog
```

Examples:

- reservation created
- payment approved
- ticket issued
- check-in accepted
- check-in rejected

Audit entries are immutable.

---

# Outbox Module

Every asynchronous side effect originates from:

```text
OutboxEvent
```

The API never communicates directly with BullMQ.

Instead:

```text
Business Transaction

↓

OutboxEvent

↓

Commit

↓

Worker
```

---

# Error Handling

Errors fall into three categories.

## Validation Errors

Examples:

```text
Missing Field

Invalid UUID

Malformed Request
```

Return:

```http
400 Bad Request
```

---

## Business Errors

Examples:

```text
Reservation Expired

Payment Already Approved

Ticket Already Consumed

Waitlist Closed
```

Return:

```http
409 Conflict
```

or

```http
422 Unprocessable Entity
```

depending on the business rule.

---

## Infrastructure Errors

Examples:

```text
Database Offline

Redis Offline

Unexpected Exception
```

Return:

```http
500 Internal Server Error
```

while preserving the standardized error envelope.

---

# Performance Guidelines

Business transactions should remain short.

Recommended sequence:

```text
Validate

↓

Transaction

↓

Commit

↓

Respond

↓

Background Processing
```

Expensive work belongs in workers.

---

# Business Boundaries

Each module owns its own business rules.

Example:

Payments may change:

```text
Payment

Order

Outbox

Audit
```

but never manipulate:

```text
Dashboard

Analytics
```

Those belong to different domains.

---

# Service Communication

Current communication pattern:

```text
Browser

↓

api-write

↓

Database

↓

Outbox

↓

Worker
```

Future internal services should communicate through:

- HTTP APIs
- Queue events

Direct database access between services should be avoided.

---

# Scalability

The service is designed for horizontal scaling.

Example deployment:

```text
api-write-1

api-write-2

api-write-3
```

Distributed locks guarantee safe concurrent execution.

---

# Security Considerations

The service never exposes:

- JWT secrets
- HMAC secrets
- provider credentials
- raw webhook payloads
- card data
- CVV
- authentication tokens

Sensitive information is redacted from logs.

---

# Compatibility

The API maintains backward compatibility through:

- additive changes
- versioned contracts
- stable response envelopes

Breaking changes should be introduced only through explicit API versioning.

---

# Testing Strategy

`api-write` should be validated using:

- unit tests
- integration tests
- smoke tests
- concurrency tests
- queue validation
- idempotency validation
- observability smoke tests

Every critical mutation should have deterministic test coverage.

---

# Future Evolution

Planned additions include:

- payment reconciliation
- refunds
- chargebacks
- financial settlement
- ticket transfers
- QR rotation
- fraud detection
- notification providers
- marketing integrations

These features extend existing domains without altering the architectural principles.

---

# API_WRITE Principles

The `api-write` service guarantees:

- transactional consistency
- deterministic business rules
- provider independence
- complete auditability
- idempotent execution
- reliable asynchronous processing
- standardized error handling
- full observability

It serves as the authoritative write interface for every business mutation within the Flux Tickets platform.

---

# API_WRITE Complete

Together, Parts 1 and 2 document the transactional architecture of `api-write`, including its business domains, request lifecycle, endpoint organization, transactions, asynchronous integration, observability, and future evolution.

---
