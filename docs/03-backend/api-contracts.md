# API Contracts

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Flux Tickets platform is composed of multiple applications that communicate exclusively through documented HTTP APIs.

Every application consumes backend contracts instead of accessing the database directly.

Applications include:

* Consumer Portal
* Organizer Dashboard
* Staff PWA
* Background Workers
* Future Mobile Applications
* Future Public SDKs

The backend is divided into specialized services:

* `api-read`
* `api-write`
* `ticket-worker`

Business logic resides exclusively in backend services.

---

# Architecture

```text
Consumer Portal
        │
        ▼
     api-read
        │
        ▼
Reservation
        │
        ▼
     api-write
        │
        ▼
 Payment Provider
        │
        ▼
     Outbox
        │
        ▼
   BullMQ Workers
        │
        ▼
 Ticket Engine
```

---

# Design Principles

The API follows these principles:

* Backend is the single source of truth.
* Every request is deterministic.
* Business logic never exists in the frontend.
* Every state transition is auditable.
* Every write endpoint is idempotent whenever possible.
* Every public contract is versionable.
* Internal implementation may change without breaking API consumers.

---

# Service Responsibilities

## api-read

Responsible for:

* Event catalog
* Dashboard queries
* Ticket visualization
* Public event information
* Staff offline bundles

No business mutations occur inside api-read.

---

## api-write

Responsible for:

* Reservations
* Checkout
* Payments
* Ticket issuing
* Check-ins
* Waitlists
* Webhooks

All business mutations occur inside api-write.

---

## ticket-worker

Responsible for:

* Outbox processing
* Payment recovery
* Ticket issuing
* Analytics aggregation
* Deadline validation
* Notification scheduling

Workers never expose HTTP endpoints.

---

# API Versioning

Current version:

```text
v1
```

Future breaking changes should introduce:

```text
/api/v2
```

instead of changing existing contracts.

---

# HTTP Methods

The platform follows REST conventions.

| Method | Purpose          |
| ------ | ---------------- |
| GET    | Read             |
| POST   | Create / Execute |
| PUT    | Full update      |
| PATCH  | Partial update   |
| DELETE | Remove           |

---

# Authentication

Different applications use different authentication models.

## Consumer

Future JWT.

Currently:

* Anonymous browsing
* Checkout without authentication
* Order lookup

---

## Organizer

Authentication:

```text
JWT
```

Authorization:

```text
RBAC
```

Permissions include:

* Events
* Ticket Batches
* Dashboard
* Finance
* Staff

---

## Staff

Current MVP:

Local operator profile.

Future:

JWT + RBAC.

---

## Workers

Workers authenticate internally.

No public authentication required.

---

# Headers

Common headers:

```http
Authorization: Bearer <token>

Content-Type: application/json

Accept: application/json

x-request-id: req_xxxxx
```

---

# Request ID

Every request receives a Request ID.

If supplied:

```http
x-request-id
```

the backend reuses it.

Otherwise a new identifier is generated.

The Request ID appears in:

* Logs
* AuditLog
* Responses
* Queue Jobs
* Error reports

---

# Success Envelope

Every new endpoint returns:

```json
{
    "data": {},
    "meta": {
        "requestId": "req_xxx"
    }
}
```

---

# Error Envelope

Every error returns:

```json
{
    "error": {
        "code": "PAYMENT_FAILED",
        "message": "Payment could not be processed.",
        "statusCode": 422,
        "requestId": "req_xxx",
        "details": {}
    }
}
```

Stack traces are never exposed.

---

# HTTP Status Codes

| Code | Meaning         |
| ---- | --------------- |
| 200  | Success         |
| 201  | Created         |
| 204  | No Content      |
| 400  | Invalid Request |
| 401  | Unauthorized    |
| 403  | Forbidden       |
| 404  | Not Found       |
| 409  | Conflict        |
| 422  | Business Rule   |
| 429  | Rate Limited    |
| 500  | Internal Error  |

---

# Pagination

Collections use:

```http
?page=1

&limit=20
```

Response:

```json
{
    "data": [],
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 142,
        "pages": 8,
        "requestId": "req_xxx"
    }
}
```

---

# Reservation API

Reservations temporarily lock ticket inventory.

They are the canonical checkout entry point.

---

## Create Reservation

```http
POST /tickets/reserve
```

Request

```json
{
    "eventId": "...",
    "items": [
        {
            "batchId": "...",
            "quantity": 2
        }
    ]
}
```

Success

```json
{
    "data": {
        "reservationId": "...",
        "expiresAt": "...",
        "items": []
    },
    "meta": {
        "requestId": "..."
    }
}
```

Possible Errors

* Event not found
* Batch unavailable
* Sold out
* Reservation limit exceeded

---

## Renew Reservation

```http
POST /tickets/renew-lock
```

Current payload

```json
{
    "reservationId": "..."
}
```

Legacy payload remains temporarily supported.

Returns:

```json
{
    "data": {
        "expiresAt": "..."
    },
    "meta": {
        "requestId": "..."
    }
}
```

---

## Cancel Reservation

Future endpoint.

```http
DELETE /tickets/reserve/:reservationId
```

Inventory returns immediately.

---

# Checkout API

Checkout transforms a Reservation into an Order.

---

## Checkout

```http
POST /payments/checkout
```

Request

```json
{
    "reservationId": "...",
    "buyer": {},
    "holders": [],
    "paymentMethod": "PIX"
}
```

Response

```json
{
    "data": {
        "orderId": "...",
        "paymentId": "...",
        "status": "PENDING"
    },
    "meta": {
        "requestId": "..."
    }
}
```

---

# Checkout States

Possible results:

* Pending
* Approved
* Failed
* Expired

The frontend never infers state.

State comes exclusively from backend.

---

# Payment API

Payment Providers are abstracted behind the PaymentProvider interface.

The frontend never knows which provider is active.

---

## Get Payment

```http
GET /payments/:paymentId
```

Returns:

```json
{
    "data": {
        "paymentId": "...",
        "status": "PENDING",
        "provider": "mock"
    },
    "meta": {
        "requestId": "..."
    }
}
```

---

## Retry Payment

Future endpoint.

```http
POST /payments/:paymentId/retry
```

Creates a new payment attempt.

---

## Recover Pending Payment

Background workers periodically synchronize pending payments with the provider.

Clients do not trigger this manually.

---

# Payment States

Supported statuses:

```text
PENDING

APPROVED

REJECTED

FAILED

EXPIRED

REFUNDED (future)
```

Provider-specific statuses are mapped into internal statuses.

---

# Payment Idempotency

Every payment approval must be idempotent.

Multiple approval attempts must result in exactly:

* One approved Payment
* One completed Order
* One issued Ticket
* One TicketStatusHistory transition
* One inventory decrement

Duplicate approvals become no-ops.

---

# Concurrency Guarantee

Approval flow is protected through:

* Transactions
* Row locking
* State reload
* Idempotency guards

Multiple concurrent requests cannot generate duplicated business effects.

---

# Legacy Compatibility

Legacy routes remain available temporarily while frontend applications migrate.

Examples include:

* Legacy reservation payloads
* Legacy payment webhook aliases
* Legacy staff synchronization routes

Compatibility layers will be removed after all applications adopt the canonical contracts.

---

# Next Section

Part 2 documents:

* Ticket API
* Ticket Engine API
* QR Protocol
* PDF Generation
* Apple Wallet
* Google Wallet
* Waitlist API
* Webhooks

---

# Ticket API

The Ticket API exposes all consumer-facing ticket operations.

Tickets only exist after a successful payment approval.

Every ticket has:

- A unique identifier
- One holder
- One event
- One batch
- One QR Code
- One lifecycle

The Ticket Engine is the source of truth for ticket validity.

---

## Get Ticket

```http
GET /tickets/:ticketId
```

Returns:

```json
{
  "data": {
    "ticketId": "...",
    "status": "VALID",
    "holder": {},
    "event": {},
    "batch": {},
    "qrVersion": 1
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

## Get Ticket History

Future endpoint.

```http
GET /tickets/:ticketId/history
```

Returns chronological state transitions.

Example:

```text
Reserved

↓

Payment Pending

↓

Payment Approved

↓

Issued

↓

Consumed
```

---

## Ticket Status

Possible values:

```text
PENDING

VALID

CONSUMED

REVOKED

CANCELLED

REFUNDED

EXPIRED
```

The frontend must never infer status.

---

# Ticket Engine

The Ticket Engine is responsible for validating every ticket.

Every application delegates ticket validation to the same backend rules.

It is shared by:

- Consumer Portal
- Dashboard
- Staff PWA
- Workers
- Wallet exports
- PDF generation

---

## Responsibilities

The Ticket Engine:

- validates signatures
- loads ticket
- validates event
- validates state
- validates expiration
- validates revocation
- validates ownership (future)
- returns a normalized Ticket DTO

---

## Validation Flow

```text
QR Code

↓

Parse Payload

↓

Verify Signature

↓

Load Ticket

↓

Validate Status

↓

Validate Event

↓

Validate Rules

↓

TicketDTO
```

---

# Ticket DTO

Every validation returns a normalized structure.

Example:

```json
{
  "ticketId": "...",
  "eventId": "...",
  "holderName": "...",
  "batchName": "...",
  "sectorName": "...",
  "status": "VALID",
  "qrVersion": 1,
  "issuedAt": "...",
  "signatureValid": true
}
```

Applications should render this DTO instead of rebuilding business logic.

---

# QR Code

Every issued ticket receives one QR Code.

That QR is reused everywhere.

The QR is identical in:

- Website
- PDF
- Apple Wallet
- Google Wallet

The QR is never regenerated after ticket issuance unless explicitly revoked.

---

## QR Payload

Business information is never embedded.

The QR contains only:

```json
{
  "ticketId": "...",
  "version": 1,
  "signature": "..."
}
```

---

## Signature

The signature is generated using HMAC.

Example:

```text
HMAC_SHA256

ticketId

+

version

+

secret
```

Only the backend knows the signing secret.

---

## QR Validation

Validation never trusts QR contents.

The backend always:

```text
QR

↓

ticketId

↓

Database

↓

Current Status

↓

Validation
```

The QR never contains:

- holder name
- event name
- batch
- sector
- payment information

---

## QR Versioning

Each ticket stores:

```text
qrVersion
```

Future revocation strategies may invalidate older QR versions.

Current implementation:

```text
version = 1
```

---

# Ticket Validation

Future endpoint:

```http
POST /tickets/validate
```

Request:

```json
{
  "ticketId": "...",
  "signature": "...",
  "version": 1
}
```

Response:

```json
{
  "data": {
    "status": "VALID",
    "ticket": {}
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

# PDF

Tickets may be exported as PDF.

```http
GET /tickets/:ticketId/pdf
```

Generated server-side.

Contains:

- Event
- Holder
- Batch
- Sector
- QR Code
- Instructions

The PDF always uses the same QR.

---

# Apple Wallet

Tickets may be exported as:

```http
GET /tickets/:ticketId/wallet/apple
```

Response:

```text
application/vnd.apple.pkpass
```

Contains:

- Event
- Holder
- QR
- Ticket metadata

---

# Google Wallet

Tickets may be exported through:

```http
GET /tickets/:ticketId/wallet/google
```

Contains the same information as Apple Wallet.

---

# Wallet Consistency

Website

↓

Apple Wallet

↓

Google Wallet

↓

PDF

↓

Staff Scanner

All use the exact same QR.

No platform generates its own identifier.

---

# Waitlist API

Customers may join the waiting list for sold-out batches.

---

## Join Waitlist

```http
POST /events/:eventId/batches/:batchId/waitlist
```

Request:

```json
{
  "name": "...",
  "email": "..."
}
```

Response:

```json
{
  "data": {
    "status": "JOINED"
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

## Waitlist Lifecycle

```text
Sold Out

↓

Join Waitlist

↓

Inventory Returns

↓

Worker

↓

Invitation

↓

Notification
```

---

## Waitlist Status

Possible values:

```text
WAITING

INVITED

EXPIRED

PURCHASED

CANCELLED
```

---

# Webhooks

Webhook endpoints receive asynchronous events from payment providers.

---

## Canonical Endpoint

```http
POST /webhooks/mercado-pago
```

---

## Compatibility Alias

```http
POST /payments/webhook
```

Both routes execute the same backend logic.

---

# Webhook Flow

```text
Provider

↓

Webhook

↓

Signature Validation

↓

Persist Raw Payload

↓

Idempotency Check

↓

Outbox

↓

Queue

↓

Payment Processing
```

---

# Signature Validation

When configured:

- Provider signature is verified.
- Invalid requests are rejected.
- Raw payload is preserved for auditing.

---

# Idempotency

Every provider event is processed exactly once.

The backend uses:

- providerEventId
- providerPaymentId
- idempotencyKey

Duplicate webhook deliveries become no-ops.

---

# Webhook Response

The endpoint acknowledges quickly.

```text
Webhook

↓

Persist

↓

Queue

↓

HTTP 200
```

Provider processing never occurs synchronously.

---

# Outbox Integration

Every accepted webhook creates an OutboxEvent.

Workers consume events asynchronously.

This guarantees:

- retries
- recovery
- resilience
- ordering

---

# Queue Events

Current payment-related queues:

```text
payments.webhook

payments.recoverPending

tickets.issue

waitlist.invite

notifications.placeholder
```

---

# Error Handling

Webhook failures never expose internal errors.

Responses remain standardized:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "statusCode": 422,
    "requestId": "...",
    "details": {}
  }
}
```

---

# Next Section

Part 3 documents:

- Staff API
- Dashboard API
- Monitoring API
- Error Codes
- Rate Limits
- Concurrency
- Idempotency
- Versioning
- Roadmap

---

# Ticket API

The Ticket API exposes all consumer-facing ticket operations.

Tickets only exist after a successful payment approval.

Every ticket has:

- A unique identifier
- One holder
- One event
- One batch
- One QR Code
- One lifecycle

The Ticket Engine is the source of truth for ticket validity.

---

## Get Ticket

```http
GET /tickets/:ticketId
```

Returns:

```json
{
  "data": {
    "ticketId": "...",
    "status": "VALID",
    "holder": {},
    "event": {},
    "batch": {},
    "qrVersion": 1
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

## Get Ticket History

Future endpoint.

```http
GET /tickets/:ticketId/history
```

Returns chronological state transitions.

Example:

```text
Reserved

↓

Payment Pending

↓

Payment Approved

↓

Issued

↓

Consumed
```

---

## Ticket Status

Possible values:

```text
PENDING

VALID

CONSUMED

REVOKED

CANCELLED

REFUNDED

EXPIRED
```

The frontend must never infer status.

---

# Ticket Engine

The Ticket Engine is responsible for validating every ticket.

Every application delegates ticket validation to the same backend rules.

It is shared by:

- Consumer Portal
- Dashboard
- Staff PWA
- Workers
- Wallet exports
- PDF generation

---

## Responsibilities

The Ticket Engine:

- validates signatures
- loads ticket
- validates event
- validates state
- validates expiration
- validates revocation
- validates ownership (future)
- returns a normalized Ticket DTO

---

## Validation Flow

```text
QR Code

↓

Parse Payload

↓

Verify Signature

↓

Load Ticket

↓

Validate Status

↓

Validate Event

↓

Validate Rules

↓

TicketDTO
```

---

# Ticket DTO

Every validation returns a normalized structure.

Example:

```json
{
  "ticketId": "...",
  "eventId": "...",
  "holderName": "...",
  "batchName": "...",
  "sectorName": "...",
  "status": "VALID",
  "qrVersion": 1,
  "issuedAt": "...",
  "signatureValid": true
}
```

Applications should render this DTO instead of rebuilding business logic.

---

# QR Code

Every issued ticket receives one QR Code.

That QR is reused everywhere.

The QR is identical in:

- Website
- PDF
- Apple Wallet
- Google Wallet

The QR is never regenerated after ticket issuance unless explicitly revoked.

---

## QR Payload

Business information is never embedded.

The QR contains only:

```json
{
  "ticketId": "...",
  "version": 1,
  "signature": "..."
}
```

---

## Signature

The signature is generated using HMAC.

Example:

```text
HMAC_SHA256

ticketId

+

version

+

secret
```

Only the backend knows the signing secret.

---

## QR Validation

Validation never trusts QR contents.

The backend always:

```text
QR

↓

ticketId

↓

Database

↓

Current Status

↓

Validation
```

The QR never contains:

- holder name
- event name
- batch
- sector
- payment information

---

## QR Versioning

Each ticket stores:

```text
qrVersion
```

Future revocation strategies may invalidate older QR versions.

Current implementation:

```text
version = 1
```

---

# Ticket Validation

Future endpoint:

```http
POST /tickets/validate
```

Request:

```json
{
  "ticketId": "...",
  "signature": "...",
  "version": 1
}
```

Response:

```json
{
  "data": {
    "status": "VALID",
    "ticket": {}
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

# PDF

Tickets may be exported as PDF.

```http
GET /tickets/:ticketId/pdf
```

Generated server-side.

Contains:

- Event
- Holder
- Batch
- Sector
- QR Code
- Instructions

The PDF always uses the same QR.

---

# Apple Wallet

Tickets may be exported as:

```http
GET /tickets/:ticketId/wallet/apple
```

Response:

```text
application/vnd.apple.pkpass
```

Contains:

- Event
- Holder
- QR
- Ticket metadata

---

# Google Wallet

Tickets may be exported through:

```http
GET /tickets/:ticketId/wallet/google
```

Contains the same information as Apple Wallet.

---

# Wallet Consistency

Website

↓

Apple Wallet

↓

Google Wallet

↓

PDF

↓

Staff Scanner

All use the exact same QR.

No platform generates its own identifier.

---

# Waitlist API

Customers may join the waiting list for sold-out batches.

---

## Join Waitlist

```http
POST /events/:eventId/batches/:batchId/waitlist
```

Request:

```json
{
  "name": "...",
  "email": "..."
}
```

Response:

```json
{
  "data": {
    "status": "JOINED"
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

## Waitlist Lifecycle

```text
Sold Out

↓

Join Waitlist

↓

Inventory Returns

↓

Worker

↓

Invitation

↓

Notification
```

---

## Waitlist Status

Possible values:

```text
WAITING

INVITED

EXPIRED

PURCHASED

CANCELLED
```

---

# Webhooks

Webhook endpoints receive asynchronous events from payment providers.

---

## Canonical Endpoint

```http
POST /webhooks/mercado-pago
```

---

## Compatibility Alias

```http
POST /payments/webhook
```

Both routes execute the same backend logic.

---

# Webhook Flow

```text
Provider

↓

Webhook

↓

Signature Validation

↓

Persist Raw Payload

↓

Idempotency Check

↓

Outbox

↓

Queue

↓

Payment Processing
```

---

# Signature Validation

When configured:

- Provider signature is verified.
- Invalid requests are rejected.
- Raw payload is preserved for auditing.

---

# Idempotency

Every provider event is processed exactly once.

The backend uses:

- providerEventId
- providerPaymentId
- idempotencyKey

Duplicate webhook deliveries become no-ops.

---

# Webhook Response

The endpoint acknowledges quickly.

```text
Webhook

↓

Persist

↓

Queue

↓

HTTP 200
```

Provider processing never occurs synchronously.

---

# Outbox Integration

Every accepted webhook creates an OutboxEvent.

Workers consume events asynchronously.

This guarantees:

- retries
- recovery
- resilience
- ordering

---

# Queue Events

Current payment-related queues:

```text
payments.webhook

payments.recoverPending

tickets.issue

waitlist.invite

notifications.placeholder
```

---

# Error Handling

Webhook failures never expose internal errors.

Responses remain standardized:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "statusCode": 422,
    "requestId": "...",
    "details": {}
  }
}
```

---

# Next Section

Part 3 documents:

- Staff API
- Dashboard API
- Monitoring API
- Error Codes
- Rate Limits
- Concurrency
- Idempotency
- Versioning
- Roadmap

---

# Staff API

The Staff API powers the official Flux Tickets Staff PWA.

Its primary responsibility is validating tickets at the event entrance while supporting fully offline operation.

The Staff API is intentionally separated from checkout and payment operations.

---

# Responsibilities

The Staff Platform is responsible for:

- Downloading offline bundles
- Offline validation
- Synchronizing check-ins
- Conflict detection
- Audit logging
- Device identification
- Operator attribution

---

## Offline Bundle

```http
GET /staff/events/:eventId/offline-bundle
```

Returns the complete validation bundle for an event.

Includes:

- Event metadata
- Ticket list
- Holder information
- Ticket signatures
- Sector permissions
- Bundle signature
- Generated timestamp

---

Example Response

```json
{
  "data": {
    "event": {},
    "generatedAt": "...",
    "signature": "...",
    "tickets": []
  },
  "meta": {
    "requestId": "..."
  }
}
```

---

## Check-in Synchronization

```http
POST /staff/checkins/sync
```

Uploads locally collected check-ins.

Example Request

```json
{
  "deviceId": "...",
  "operator": {
    "name": "John Doe",
    "cpf": "12345678900"
  },
  "checkins": []
}
```

---

## Operator Identification

Current MVP identifies the operator using:

- Name
- CPF

No authentication is required.

The objective is operational traceability.

Future versions will replace this with JWT authentication.

---

## Device Identification

Each synchronization includes:

- Device ID
- Bundle Version
- Synchronization Timestamp

Future versions may bind devices to organizers.

---

## Offline Validation Flow

```text
Offline Bundle

↓

Local IndexedDB

↓

Scan QR

↓

Validate Signature

↓

Local Status

↓

Accepted

↓

Offline Queue
```

---

## Synchronization Flow

```text
Offline Queue

↓

POST /staff/checkins/sync

↓

Conflict Detection

↓

Audit

↓

History

↓

Checkin
```

---

## Conflict Detection

The backend detects:

- Already consumed
- Invalid signature
- Event mismatch
- Sector mismatch
- Ticket not found
- Offline state conflict

---

## Accepted Check-ins

Accepted validations create:

- Checkin
- TicketStatusHistory
- AuditLog

Rejected validations create:

- AuditLog only

No Checkin rows are created for rejected attempts.

---

## Offline State Conflict

Late synchronization after another device already validated the ticket returns:

```text
OFFLINE_STATE_CONFLICT
```

This status is auditable.

---

## Duplicate Protection

Repeated uploads of the same accepted check-in become no-ops.

Exactly one accepted Checkin exists for each ticket.

---

# Dashboard API

The Organizer Dashboard consumes only backend-generated analytics.

The frontend performs no business calculations.

---

## Overview

```http
GET /dashboard/overview
```

Returns:

- Revenue
- Tickets Sold
- Average Ticket
- Occupancy
- Check-ins
- Operational Controls
- Recent Sales

---

## Priority Event

```http
GET /dashboard/priority-event
```

Returns the event with the highest operational priority.

---

## Events Priority

```http
GET /dashboard/events-priority
```

Returns organizer events sorted by backend priority score.

---

## Lots Performance

```http
GET /dashboard/events/:eventId/lots-performance
```

Returns:

- Batch occupancy
- Sales
- Remaining inventory
- Revenue
- Capacity

---

## Alerts

```http
GET /dashboard/alerts
```

Returns operational alerts generated by backend rules.

Examples:

- Low inventory
- Sales paused
- Payment failures
- High validation volume

---

# Dashboard Principles

The Dashboard frontend:

- never aggregates
- never calculates
- never ranks events
- never computes KPIs

It only renders backend responses.

---

# Monitoring API

Production monitoring endpoints.

---

## Health Live

```http
GET /health/live
```

Checks process availability.

No external dependency required.

---

## Health Ready

```http
GET /health/ready
```

Checks:

- Database
- Redis
- Queue availability

Returns:

- 200 Healthy
- 503 Degraded

---

## Metrics

```http
GET /metrics
```

Available only when:

```text
PROMETHEUS_ENABLED=true
```

---

Metrics include:

- HTTP Requests
- Latency
- Redis
- Database
- BullMQ
- Business Counters

---

## Version

```http
GET /version
```

Returns:

- Service
- Version
- APP_ENV
- Commit
- Build Timestamp
- Uptime

---

## Queue Monitoring

```http
GET /monitoring/queues
```

Returns:

- Waiting Jobs
- Active Jobs
- Completed Jobs
- Failed Jobs
- Dead-letter Jobs

For every registered queue.

---

# Error Codes

Common business codes include:

```text
INVALID_REQUEST

UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_FAILED

PAYMENT_PENDING

PAYMENT_FAILED

PAYMENT_EXPIRED

PAYMENT_REJECTED

PAYMENT_ALREADY_APPROVED

RESERVATION_EXPIRED

SOLD_OUT

WAITLIST_JOINED

INVALID_SIGNATURE

INVALID_QR

TICKET_NOT_FOUND

TICKET_ALREADY_CONSUMED

OFFLINE_STATE_CONFLICT

EVENT_MISMATCH

SECTOR_MISMATCH

RATE_LIMITED

INTERNAL_ERROR
```

---

# Idempotency

The following operations are fully idempotent:

- Reservation renewal
- Payment approval
- Payment recovery
- Webhooks
- Ticket issuance
- Check-in synchronization
- Queue retries

Repeated requests must never produce duplicate business effects.

---

# Concurrency

Critical write operations are protected using:

- Database transactions
- Row locking
- Idempotency guards
- State reloading
- Queue isolation

Expected result:

```text
50 concurrent approvals

↓

1 Payment Approved

↓

1 Order Completed

↓

1 Ticket Issued

↓

1 TicketStatusHistory Transition

↓

1 AuditLog Entry
```

The same guarantee applies to Staff check-ins.

---

# Rate Limits

Suggested limits:

| Endpoint | Limit |
|----------|------:|
| GET /events | 120/min |
| POST /tickets/reserve | 20/min |
| POST /payments/checkout | 10/min |
| POST /payments/webhook | Provider controlled |
| POST /staff/checkins/sync | 100/min/device |
| GET /dashboard/* | 60/min |
| GET /metrics | Internal only |

Limits may evolve according to infrastructure.

---

# API Compatibility

Backward-compatible aliases remain available during migrations.

Examples include:

- Legacy webhook endpoint
- Legacy reservation payload
- Legacy staff synchronization endpoint

Deprecated endpoints will be removed only after all first-party applications migrate.

---

# Security

The API never exposes:

- JWT secrets
- HMAC secrets
- Payment provider secrets
- Card numbers
- CVV
- Raw gateway credentials

Sensitive values are redacted from logs.

---

# Observability

Every request is traceable using:

- requestId
- AuditLog
- Pino structured logs
- Queue metadata
- Worker logs
- Optional Sentry integration

This enables full request tracing across the platform.

---

# Future APIs

Planned additions include:

- Customer authentication
- Coupon management
- Promoter management
- Affiliate APIs
- Marketing attribution
- Financial reconciliation
- Refund management
- Administrative platform
- Public Organizer APIs
- Mobile SDK

---

# Roadmap

## Phase 6A

- Payment abstraction
- Waitlist
- Pending recovery
- Abandoned carts
- Mock Payment Provider

Completed.

---

## Phase 6A.1

- Payment Engine hardening
- Queue validation
- Concurrency guarantees
- Approval idempotency
- Worker idempotency

---

## Phase 6B

- Ticket Engine
- QR generation
- QR validation
- PDF generation
- Apple Wallet
- Google Wallet

---

## Phase 6C

- Consumer ticket experience
- Staff scanner UI
- Ticket lifecycle completion
- End-to-end validation

---

## Phase 7+

- Marketing Platform
- Financial Platform
- Administrative Panel
- Analytics Engine
- AI Insights
- Public APIs

---

# Contract Stability

The Flux Tickets API follows a **contract-first** philosophy.

Internal implementations may evolve, providers may change, and database structures may be optimized, but published API contracts should remain stable whenever possible.

Breaking changes require a new API version and a documented migration path.

