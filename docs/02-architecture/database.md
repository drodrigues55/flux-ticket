# Database

> Version: 2.0  
> Last Updated: June 2026

---

# Overview

The Flux Tickets database is the canonical source of truth for every business operation performed by the platform.

No frontend application accesses the database directly.

All reads and writes occur exclusively through backend services.

Applications consuming the database indirectly include:

- Consumer Portal
- Organizer Dashboard
- Staff PWA
- Background Workers
- Future Mobile Apps
- Administrative Panel

---

# Database Philosophy

The database is designed around business domains instead of application screens.

Every table represents a business concept.

Examples:

- Event
- Reservation
- Order
- Payment
- Ticket
- Checkin

instead of:

- Checkout Page
- Dashboard Card
- Ticket Screen

This keeps the data model stable while applications evolve.

---

# Architectural Principles

The database follows these principles:

- Domain-driven modeling
- Backend as the source of truth
- Explicit relationships
- Immutable business history
- Auditability
- High concurrency support
- Horizontal scalability
- Event-driven architecture
- Idempotent write operations

---

# Database Services

The database is shared between:

```text
api-read

↓

Read Queries
```

```text
api-write

↓

Business Transactions
```

```text
ticket-worker

↓

Background Processing
```

Every service has different responsibilities.

---

# Read vs Write

The platform separates reads from writes.

## api-read

Responsible for:

- Catalog
- Dashboard
- Public Event Data
- Staff Offline Bundles

No business mutation occurs here.

---

## api-write

Responsible for:

- Reservations
- Checkout
- Payments
- Ticket Issuing
- Check-ins
- Waitlists

Every transaction originates here.

---

## ticket-worker

Responsible for:

- Outbox processing
- Queue execution
- Payment recovery
- Analytics
- Notifications
- Scheduled jobs

Workers never bypass business rules.

---

# Domain Organization

The database is organized into business domains.

```text
Identity

↓

Catalog

↓

Checkout

↓

Payments

↓

Ticket Engine

↓

Staff

↓

Infrastructure

↓

Analytics
```

Each domain owns its entities.

---

# High-Level Entity Flow

```text
Organizer

↓

Event

↓

TicketBatch

↓

Reservation

↓

Order

↓

Payment

↓

Ticket

↓

Checkin
```

Supporting infrastructure:

```text
AuditLog

OutboxEvent

WaitlistEntry

TicketStatusHistory
```

---

# Database Engine

Current implementation:

```text
PostgreSQL
```

ORM:

```text
Prisma
```

Future optimizations should remain compatible with PostgreSQL.

---

# Primary Keys

Every entity uses UUIDs.

Example:

```text
id UUID
```

Reasons:

- Distributed systems
- Queue compatibility
- Easier replication
- Safer public identifiers

Sequential IDs are intentionally avoided.

---

# Foreign Keys

Relationships are always explicit.

Example:

```text
Ticket

↓

Order

↓

Reservation

↓

Event
```

No implicit joins through business logic.

---

# Naming Conventions

Tables use PascalCase.

Examples:

```text
User

Organizer

Reservation

ReservationItem

Order

Payment

Ticket

Checkin
```

Fields use camelCase.

Examples:

```text
createdAt

updatedAt

reservationId

ticketBatchId
```

---

# Timestamp Convention

Every persistent entity should contain:

```text
createdAt

updatedAt
```

Business entities may also include:

```text
expiresAt

issuedAt

consumedAt

cancelledAt

processedAt
```

Each timestamp represents a business event.

---

# Soft Delete

The platform prefers explicit business states instead of deleting rows.

Example:

Instead of:

```text
DELETE Ticket
```

The ticket becomes:

```text
REVOKED
```

or

```text
CANCELLED
```

Historical data must remain available.

---

# Immutable History

Critical business operations are never overwritten.

Instead, history tables are used.

Examples:

```text
TicketStatusHistory
```

```text
AuditLog
```

Business history is append-only.

---

# Audit Strategy

Every important mutation generates an audit entry.

Examples:

- Reservation created
- Payment approved
- Ticket issued
- Ticket consumed
- Staff synchronization
- Manual actions

Audit records should never be edited.

---

# Outbox Pattern

Every asynchronous business event generates an OutboxEvent.

Flow:

```text
Business Transaction

↓

Commit

↓

OutboxEvent

↓

Worker

↓

Queue

↓

External Action
```

This guarantees reliable event delivery.

---

# Event-Driven Architecture

The platform avoids direct synchronous side effects.

Example:

Instead of:

```text
Approve Payment

↓

Send Email
```

The flow becomes:

```text
Approve Payment

↓

Outbox

↓

Queue

↓

Worker

↓

Notification
```

This improves resiliency and retry behavior.

---

# Transaction Boundaries

Business transactions should remain small and deterministic.

Typical transaction:

```text
Reservation

↓

Order

↓

Payment

↓

Commit
```

Long-running operations are delegated to workers.

---

# Idempotency

The database supports idempotent writes.

Critical operations must execute exactly once.

Examples:

- Payment approval
- Ticket issuance
- Check-in synchronization
- Webhook processing

Duplicate requests become no-ops.

---

# Concurrency

Multiple clients may operate simultaneously.

The database must safely support:

- Concurrent reservations
- Duplicate webhooks
- Parallel payment recovery
- Multiple staff devices
- Simultaneous dashboard reads

Concurrency protection uses:

- Transactions
- Row locking
- Unique constraints
- State validation
- Idempotency checks

---

# Index Strategy

Indexes exist for:

Primary Keys

Foreign Keys

Frequently filtered columns

Business identifiers

Status columns

Expiration timestamps

Queue processing

Examples:

```text
paymentId

reservationId

eventId

status

expiresAt

providerEventId

createdAt
```

Indexes should always reflect real query patterns.

---

# Constraints

The database favors integrity over convenience.

Examples include:

- Foreign keys
- Unique constraints
- Required relationships
- Status validation
- Enum enforcement

Business invariants belong in the database whenever possible.

---

# Enums

Business states are represented by enums.

Examples:

```text
ReservationStatus
```

```text
OrderStatus
```

```text
PaymentStatus
```

```text
TicketStatus
```

```text
WaitlistStatus
```

Enums improve consistency and simplify validation.

---

# Migrations

Schema evolution follows additive migrations.

Rules:

- Never rename existing columns during active development.
- Never drop production columns immediately.
- Introduce compatibility layers.
- Remove legacy structures only after migration.

Every migration must be reversible at the application level.

---

# Environment Separation

Each environment owns its own database.

```text
Development

↓

Staging

↓

Production
```

Data is never shared across environments.

---

# Backup Strategy

Production databases should support:

- Daily backups
- Point-in-time recovery
- Disaster recovery testing
- Off-site backup storage

Backup strategy is infrastructure responsibility, not application logic.

---

# Performance Principles

The database should optimize:

- Write correctness
- Read consistency
- Predictable latency
- Efficient indexing
- Controlled joins

Complex analytical queries should eventually move to dedicated aggregation tables instead of large transactional joins.

---

# Analytics Philosophy

Operational data remains normalized.

Dashboard data may eventually use:

- Materialized Views
- Aggregation Tables
- Scheduled Metrics

Analytics should never compromise transactional integrity.

---

# Security

Sensitive values are never stored in plain text.

Examples:

- Passwords are hashed.
- Payment secrets are never persisted.
- HMAC secrets remain outside the database.
- Provider credentials remain in environment variables.

Personally identifiable information should be minimized where possible.

---

# Observability

Every business operation can be traced using:

- Request ID
- AuditLog
- OutboxEvent
- Queue metadata
- Worker logs

This enables complete end-to-end traceability.

---

# Database Roadmap

Current database supports:

- Identity
- Catalog
- Checkout
- Payments
- Ticket lifecycle
- Staff Platform
- Queue infrastructure
- Observability

Upcoming domains include:

- Financial reconciliation
- Coupons
- Affiliates
- Promoters
- Marketing attribution
- Administrative platform
- Advanced analytics
- LGPD support

---

# Next Section

Part 2 documents the **Identity & Catalog** domain, including:

- User
- Organizer
- Category
- Venue
- Event
- Sector
- TicketBatch

along with their relationships, constraints, indexes, and business rules.

---

# Part 2 — Identity & Catalog Domain

The Identity & Catalog domain defines who owns events, where events happen, how events are categorized, and which ticket inventory is available for sale.

This domain is read-heavy and is consumed mainly by:

- Consumer Portal
- Organizer Dashboard
- Staff PWA
- api-read
- api-write

---

# Domain Flow

```text
User

↓

Organizer

↓

Event

↓

Sector

↓

TicketBatch
```

Optional supporting entities:

```text
Category

Venue
```

---

# User

Represents a person who can interact with the platform.

A user may be:

- Consumer
- Organizer
- Staff
- Admin

---

## Fields

```text
id

name

email

cpf

passwordHash

role

createdAt

updatedAt
```

---

## Roles

```text
USER

ORGANIZER

STAFF

ADMIN
```

---

## Rules

- Email should be unique.
- CPF validation should use the Brazilian CPF digit verification algorithm.
- Passwords must never be stored in plain text.
- CPF uniqueness should be handled carefully because a CPF may appear as buyer, holder, staff operator, or organizer representative.

---

## Indexes

```text
User.email

User.cpf

User.role
```

---

# Organizer

Represents an event producer.

An Organizer owns events, ticket batches, dashboard data, staff access, and future financial records.

---

## Fields

```text
id

userId

document

legalName

tradeName

status

createdAt

updatedAt
```

---

## Status

```text
PENDING

ACTIVE

SUSPENDED

BLOCKED
```

---

## Relationships

```text
Organizer

↓

User
```

```text
Organizer

↓

Event[]
```

---

## Rules

- One organizer may own many events.
- Organizer approval may be required before publishing events.
- Future financial onboarding depends on this entity.

---

## Indexes

```text
Organizer.userId

Organizer.document

Organizer.status
```

---

# Category

Represents an event category.

Examples:

```text
Music

Sports

Theater

Business

Nightlife

Festival
```

---

## Fields

```text
id

name

slug

description

createdAt

updatedAt
```

---

## Rules

- Slug should be unique.
- Categories are used for catalog filtering.
- Categories should not be hardcoded in the frontend.

---

## Indexes

```text
Category.slug

Category.name
```

---

# Venue

Represents the physical location of an event.

---

## Fields

```text
id

name

address

city

state

country

postalCode

capacity

latitude

longitude

createdAt

updatedAt
```

---

## Rules

- Venue capacity can be used as a validation reference.
- Event capacity may differ from venue capacity depending on layout.
- Coordinates are optional but useful for maps and discovery.

---

## Indexes

```text
Venue.city

Venue.state

Venue.name
```

---

# Event

Represents a sellable event.

It is the central catalog entity.

---

## Fields

```text
id

organizerId

categoryId

venueId

name

slug

description

imageUrl

startsAt

endsAt

status

createdAt

updatedAt
```

---

## Status

```text
DRAFT

PUBLISHED

PAUSED

SOLD_OUT

CANCELLED

FINISHED
```

---

## Relationships

```text
Event

↓

Organizer
```

```text
Event

↓

Category
```

```text
Event

↓

Venue
```

```text
Event

↓

Sector[]
```

```text
Event

↓

TicketBatch[]
```

```text
Event

↓

Reservation[]
```

```text
Event

↓

Ticket[]
```

```text
Event

↓

Checkin[]
```

---

## Rules

- Only published events appear in the public catalog.
- Cancelled events cannot accept new reservations.
- Finished events cannot accept new check-ins except administrative correction flows.
- Event slug should be stable and unique.
- Event start and end dates must be valid.
- An event belongs to exactly one organizer.

---

## Catalog Fields

For fast catalog rendering, the API may expose:

```text
name

slug

imageUrl

startsAt

venue

startingPrice

availability

status
```

These values may be calculated by api-read.

---

## Indexes

```text
Event.organizerId

Event.categoryId

Event.venueId

Event.slug

Event.status

Event.startsAt
```

Composite:

```text
Event(status, startsAt)

Event(organizerId, status)

Event(categoryId, status)
```

---

# Sector

Represents a physical or logical section inside an event.

Examples:

```text
General Admission

VIP

Premium

Backstage

Mezzanine
```

---

## Fields

```text
id

eventId

name

capacity

createdAt

updatedAt
```

---

## Relationships

```text
Sector

↓

Event
```

```text
Sector

↓

TicketBatch[]
```

```text
Sector

↓

Ticket[]
```

```text
Sector

↓

Checkin[]
```

---

## Rules

- A sector belongs to one event.
- A sector may contain multiple ticket batches.
- Sector capacity should not be exceeded by all related batches unless explicitly allowed.
- Staff validation may restrict check-ins to specific sectors.

---

## Indexes

```text
Sector.eventId

Sector.name
```

Composite:

```text
Sector(eventId, name)
```

---

# TicketBatch

Represents a sellable batch of tickets.

Examples:

```text
Lote 1

Lote 2

VIP

Meia Entrada

Cortesia

Promocional
```

---

## Fields

```text
id

eventId

sectorId

name

price

totalQuantity

availableQuantity

startsAt

endsAt

status

isActive

createdAt

updatedAt
```

---

## Status

```text
DRAFT

ACTIVE

PAUSED

SOLD_OUT

EXPIRED

HIDDEN
```

---

## Relationships

```text
TicketBatch

↓

Event
```

```text
TicketBatch

↓

Sector
```

```text
TicketBatch

↓

ReservationItem[]
```

```text
TicketBatch

↓

Ticket[]
```

```text
TicketBatch

↓

WaitlistEntry[]
```

---

## Rules

- A batch belongs to one event.
- A batch may optionally belong to one sector.
- `availableQuantity` must never become negative.
- Reservations temporarily reduce available inventory.
- Expired reservations return inventory.
- Paid orders permanently consume inventory.
- Cancelled or refunded tickets may return inventory depending on event policy.
- A sold-out batch may enable waitlist.

---

## Inventory Rules

The platform must prevent overselling.

Inventory changes should be atomic.

Typical flow:

```text
Reserve

↓

Decrease temporary availability

↓

Payment approved

↓

Convert reservation into ticket

↓

Finalize inventory
```

If checkout fails:

```text
Reservation expires

↓

Inventory returns
```

---

## Indexes

```text
TicketBatch.eventId

TicketBatch.sectorId

TicketBatch.status

TicketBatch.isActive
```

Composite:

```text
TicketBatch(eventId, status)

TicketBatch(eventId, sectorId)

TicketBatch(eventId, isActive)
```

---

# Event Publication Rules

An event can be published only when it has:

- Organizer
- Title
- Date
- Venue
- At least one active batch
- Valid inventory
- Valid pricing

Future requirements may include:

- Organizer approval
- Payment onboarding
- Legal policy
- Refund policy

---

# Catalog Read Optimization

Catalog queries are high volume.

They should avoid expensive joins when possible.

Possible optimization strategies:

- indexed queries
- cached public event cards
- read models
- materialized views
- precomputed starting price
- precomputed availability

---

# Staff Dependency

Staff PWA depends on catalog data for:

- Event selection
- Sector selection
- Bundle generation
- Offline validation

---

# Dashboard Dependency

Organizer Dashboard depends on catalog data for:

- Event priority
- Lot performance
- Revenue per event
- Occupancy
- Alerts

---

# Consumer Dependency

Consumer Portal depends on catalog data for:

- Home
- Search
- Event details
- Ticket selection
- Checkout

---

# Data Integrity Rules

- Every TicketBatch must reference a valid Event.
- Every Sector must reference a valid Event.
- Every Event must reference a valid Organizer.
- Published events should not reference inactive organizers.
- Public catalog must not expose draft or cancelled events.
- Availability must be calculated from backend data only.

---

# Future Catalog Models

Future entities may include:

```text
EventImage

EventPolicy

EventFaq

EventSchedule

SeatMap

Seat

EventSponsor

EventTag
```

---

# Next Section

Part 3 documents the Checkout Domain, including:

- Reservation
- ReservationItem
- Order
- Payment
- WaitlistEntry
- ReservationStatus
- OrderStatus
- PaymentStatus
- WaitlistStatus

---

# Part 3 — Checkout Domain

The Checkout Domain manages the complete purchase lifecycle.

Its responsibility is transforming customer intent into valid issued tickets.

The checkout process is intentionally divided into independent stages to maximize reliability, recoverability, and concurrency safety.

---

# Checkout Lifecycle

```text
Customer

↓

Reservation

↓

ReservationItem

↓

Order

↓

Payment

↓

Approval

↓

Ticket Issue
```

Every transition is auditable.

---

# Reservation

A Reservation temporarily locks ticket inventory.

Reservations exist independently from payments.

A reservation is the canonical checkout entry point.

---

## Fields

```text
id

eventId

status

expiresAt

createdAt

updatedAt
```

---

## Relationships

```text
Reservation

↓

ReservationItem[]
```

```text
Reservation

↓

Order
```

```text
Reservation

↓

Event
```

---

## Reservation Status

```text
ACTIVE

EXPIRED

COMPLETED

ABANDONED
```

---

## Business Rules

A reservation:

- temporarily locks inventory
- owns one or more ReservationItems
- expires automatically
- cannot be reused after completion
- may only generate one Order

---

## Reservation Lifecycle

```text
Created

↓

Inventory Locked

↓

Checkout Started

↓

Payment

↓

Completed
```

or

```text
Created

↓

Expires

↓

Inventory Released

↓

ABANDONED
```

---

## Indexes

```text
Reservation.eventId

Reservation.status

Reservation.expiresAt
```

Composite:

```text
Reservation(status, expiresAt)
```

---

# ReservationItem

Represents an individual ticket request inside a reservation.

---

## Fields

```text
id

reservationId

ticketBatchId

quantity

unitPrice

createdAt
```

---

## Relationships

```text
ReservationItem

↓

Reservation
```

```text
ReservationItem

↓

TicketBatch
```

---

## Rules

- Every ReservationItem belongs to exactly one Reservation.
- Quantity must be greater than zero.
- Price is copied at reservation time to preserve checkout consistency.
- Inventory validation always occurs before insertion.

---

## Indexes

```text
ReservationItem.reservationId

ReservationItem.ticketBatchId
```

---

# Order

Represents a commercial purchase.

Orders group one or more payments and the resulting tickets.

---

## Fields

```text
id

reservationId

buyerId

status

totalAmount

currency

createdAt

updatedAt

completedAt
```

---

## Relationships

```text
Order

↓

Reservation
```

```text
Order

↓

Payment[]
```

```text
Order

↓

Ticket[]
```

---

## Order Status

```text
PENDING

COMPLETED

EXPIRED

CANCELLED

REFUNDED
```

---

## Rules

- One reservation generates at most one order.
- Orders never own inventory.
- Orders become immutable after completion.
- Only one completed state transition is allowed.

---

## Order Lifecycle

```text
Reservation

↓

Order Created

↓

Payment Pending

↓

Payment Approved

↓

Completed
```

---

## Indexes

```text
Order.reservationId

Order.status

Order.createdAt
```

Composite:

```text
Order(status, createdAt)
```

---

# Payment

Represents a payment attempt.

Multiple payment attempts may exist for one order.

Only one successful payment may complete an order.

---

## Fields

```text
id

orderId

provider

providerPaymentId

providerStatus

providerEventId

idempotencyKey

status

amount

currency

rawPayload

createdAt

updatedAt
```

---

## Relationships

```text
Payment

↓

Order
```

---

## Payment Status

```text
PENDING

APPROVED

REJECTED

FAILED

EXPIRED

REFUNDED
```

---

## Business Rules

A payment:

- belongs to one order
- has one provider
- has one internal status
- may receive multiple provider events
- must be idempotent

---

## Provider Status

Provider status is stored separately.

Example:

```text
Provider

↓

approved
```

↓

Mapped to

```text
APPROVED
```

This isolates provider-specific terminology.

---

## Payment Lifecycle

```text
Created

↓

Pending

↓

Webhook

↓

Approved
```

or

```text
Created

↓

Rejected
```

or

```text
Created

↓

Expired
```

---

## Indexes

```text
Payment.orderId

Payment.status

Payment.provider

Payment.providerPaymentId

Payment.providerEventId

Payment.idempotencyKey
```

Composite:

```text
Payment(provider, providerPaymentId)

Payment(status, createdAt)
```

---

# Payment Provider Abstraction

The database is provider-agnostic.

It stores generic fields instead of Mercado Pago–specific structures.

Future providers may include:

```text
Mercado Pago

Stripe

Asaas

PagSeguro
```

without schema redesign.

---

# Idempotency

Payment approval must execute exactly once.

The database guarantees:

```text
50 approvals

↓

1 payment approved

↓

1 order completed

↓

1 ticket issued
```

Idempotency relies on:

- providerEventId
- idempotencyKey
- transactions
- state validation

---

# WaitlistEntry

Represents a customer waiting for inventory.

---

## Fields

```text
id

eventId

ticketBatchId

name

email

status

createdAt

updatedAt
```

---

## Relationships

```text
WaitlistEntry

↓

Event
```

```text
WaitlistEntry

↓

TicketBatch
```

---

## Waitlist Status

```text
WAITING

INVITED

PURCHASED

EXPIRED

CANCELLED
```

---

## Rules

- Waitlist only exists for unavailable inventory.
- Invitations are processed asynchronously.
- Invitation expiration is configurable.
- Purchased entries should not receive additional invitations.

---

## Waitlist Lifecycle

```text
Join

↓

WAITING

↓

Inventory Returns

↓

INVITED

↓

Purchase

↓

PURCHASED
```

or

```text
Invitation

↓

Expires

↓

EXPIRED
```

---

## Indexes

```text
WaitlistEntry.eventId

WaitlistEntry.ticketBatchId

WaitlistEntry.status
```

Composite:

```text
WaitlistEntry(ticketBatchId, status)
```

---

# Checkout Concurrency

Checkout is designed for high concurrency.

Protection layers include:

- Redis reservation lock
- Database transactions
- Row locking
- Idempotent approval
- Worker isolation

---

## Reservation Lock

Inventory is reserved using Redis.

Flow:

```text
Reserve

↓

Redis Lock

↓

Reservation
```

Expiration automatically restores inventory.

---

## Approval Lock

Payment approval executes inside a transaction.

Conceptual flow:

```text
Acquire Lock

↓

SELECT ... FOR UPDATE

↓

Already Approved?

↓

No

↓

Approve

↓

Issue Ticket

↓

Commit
```

Duplicate approvals immediately exit.

---

# Inventory Rules

Inventory changes occur in two stages.

Temporary reservation:

```text
Inventory

↓

Reserved
```

Final confirmation:

```text
Payment Approved

↓

Inventory Consumed
```

Expired reservations restore availability.

---

# Recovery

Workers periodically recover:

- pending payments
- abandoned carts
- expired reservations

Recovery never bypasses business rules.

---

# Queue Integration

Checkout publishes OutboxEvents.

Workers process:

```text
payments.recoverPending

carts.expireAbandoned

waitlist.invite

tickets.issue

notifications.placeholder
```

---

# Data Integrity Rules

- Reservation must exist before Order.
- Order must exist before Payment.
- Payment approval must precede Ticket issuance.
- Reservation expiration restores inventory.
- Completed orders never return to pending.
- Payment status transitions are append-only.

---

# Future Checkout Models

Planned entities include:

```text
Coupon

Discount

Promotion

GiftCard

InstallmentPlan

Settlement

Refund

Chargeback
```

These integrate naturally with the existing Order and Payment model.

---

# Next Section

Part 4 documents the **Ticket Engine**, including:

- Ticket
- TicketStatusHistory
- Checkin
- QR Versioning
- Digital Signature (HMAC)
- Ticket Validation
- PDF
- Apple Wallet
- Google Wallet
- Complete Ticket Lifecycle

---

# Part 4 — Ticket Engine Domain

The Ticket Engine is the heart of the Flux Tickets platform.

Its responsibility is transforming approved payments into secure, verifiable, and traceable tickets.

Every application that interacts with tickets depends on this domain.

Consumers include:

- Consumer Portal
- Staff PWA
- Organizer Dashboard
- Background Workers
- Apple Wallet
- Google Wallet
- PDF Generator

The Ticket Engine is the single source of truth for ticket validity.

---

# Ticket Lifecycle

```text
Reservation

↓

Order

↓

Payment

↓

Approved

↓

Ticket Issued

↓

Valid

↓

Consumed

↓

Finished
```

Alternative paths:

```text
Approved

↓

Revoked
```

```text
Approved

↓

Cancelled
```

```text
Approved

↓

Refunded
```

---

# Ticket

Represents one admission credential.

Each Ticket belongs to one event and one holder.

---

## Fields

```text
id

orderId

eventId

sectorId

ticketBatchId

holderName

holderCpf

status

qrVersion

signature

issuedAt

usedAt

cancelledAt

createdAt

updatedAt
```

---

## Relationships

```text
Ticket

↓

Order
```

```text
Ticket

↓

Event
```

```text
Ticket

↓

Sector
```

```text
Ticket

↓

TicketBatch
```

```text
Ticket

↓

TicketStatusHistory[]
```

```text
Ticket

↓

Checkin[]
```

---

## Ticket Status

```text
PENDING

VALID

CONSUMED

REVOKED

CANCELLED

REFUNDED

EXPIRED
```

---

## Rules

A Ticket:

- belongs to exactly one Event
- belongs to one Order
- belongs to one TicketBatch
- belongs to one holder
- owns exactly one QR identity
- may only be consumed once

---

# Ticket Issue

Tickets are issued only after payment approval.

Flow:

```text
Payment

↓

Approved

↓

Issue Ticket

↓

Generate Signature

↓

Persist

↓

History

↓

Outbox
```

Ticket generation never occurs synchronously inside the payment provider.

Workers perform ticket issuance.

---

# TicketStatusHistory

Represents immutable lifecycle transitions.

No status is overwritten.

Every transition is appended.

---

## Fields

```text
id

ticketId

previousStatus

newStatus

reason

requestId

createdAt
```

---

## Relationships

```text
TicketStatusHistory

↓

Ticket
```

---

## Example

```text
PENDING

↓

VALID

↓

CONSUMED
```

Each transition becomes one history row.

---

## Rules

History is append-only.

Duplicate transitions are forbidden.

Example:

```text
VALID

↓

VALID
```

must never exist.

---

## Indexes

```text
TicketStatusHistory.ticketId

TicketStatusHistory.createdAt
```

Composite:

```text
(ticketId, createdAt)
```

---

# QR Identity

Every Ticket owns exactly one QR identity.

That identity is reused everywhere.

```text
Website

↓

PDF

↓

Apple Wallet

↓

Google Wallet

↓

Staff Scanner
```

No platform generates a different QR.

---

# QR Payload

The QR intentionally contains minimal information.

Example:

```json
{
    "ticketId": "...",
    "version": 1,
    "signature": "..."
}
```

No business information is embedded.

---

# Why Minimal QR?

Embedding event information would require regenerating the QR after changes.

Instead:

```text
QR

↓

ticketId

↓

Database

↓

Current Ticket
```

The database always contains the latest state.

---

# QR Version

Every Ticket stores:

```text
qrVersion
```

Current implementation:

```text
1
```

Future revocation may increment this value.

Older QR versions become invalid.

---

# Digital Signature

Each QR receives an HMAC signature.

Conceptually:

```text
HMAC

↓

ticketId

+

version

+

secret
```

Only backend services know the secret.

---

# Signature Validation

Validation steps:

```text
Read QR

↓

Parse

↓

Verify Signature

↓

Load Ticket

↓

Validate State

↓

Return Result
```

Signature validation occurs before any business rule.

---

# Ticket Validation

The Ticket Engine validates:

- Signature
- Ticket existence
- Event
- Status
- Expiration
- Revocation
- Consumption

Every validation returns a normalized Ticket DTO.

---

# Ticket DTO

Conceptual structure:

```text
Ticket

↓

Validation

↓

TicketDTO
```

Example:

```json
{
    "ticketId": "...",
    "holder": "...",
    "event": "...",
    "sector": "...",
    "batch": "...",
    "status": "VALID",
    "qrVersion": 1,
    "signatureValid": true
}
```

Applications never rebuild business logic from database tables.

---

# Checkin

Represents an accepted entrance validation.

Only successful validations generate Checkin rows.

---

## Fields

```text
id

ticketId

eventId

deviceId

operatorName

operatorCpf

checkedAt

offlineId

createdAt
```

---

## Relationships

```text
Checkin

↓

Ticket
```

```text
Checkin

↓

Event
```

---

## Rules

Only accepted validations create Checkin.

Rejected attempts generate only AuditLog entries.

One Ticket can have only one accepted Checkin.

---

## Indexes

```text
Checkin.ticketId

Checkin.eventId

Checkin.checkedAt
```

Unique:

```text
(ticketId)
```

for accepted validations.

---

# Staff Validation

Validation flow:

```text
QR

↓

Ticket Engine

↓

TicketDTO

↓

Business Rules

↓

Accepted

↓

Checkin

↓

History
```

---

# Duplicate Protection

Repeated scans must become no-ops.

Example:

```text
Scan

↓

Accepted

↓

Scan Again

↓

Already Consumed
```

No additional Checkin is created.

---

# Offline Validation

Offline bundle contains:

- Ticket IDs
- QR Signatures
- Current Status
- Event Metadata

The PWA validates locally.

Synchronization later updates the central database.

---

# Offline Conflict

If another device already consumed the ticket:

```text
Offline Queue

↓

Sync

↓

OFFLINE_STATE_CONFLICT
```

Conflict is stored in AuditLog.

No duplicate Checkin is created.

---

# PDF

Tickets may be exported as PDF.

Contains:

- Event
- Holder
- Batch
- Sector
- QR
- Instructions

The PDF QR is identical to every other platform.

---

# Apple Wallet

Wallet passes contain:

- Event
- Holder
- QR
- Basic metadata

The QR never changes after issuance.

---

# Google Wallet

Google Wallet uses the same ticket identity.

No secondary QR is generated.

---

# Ticket Consistency

All consumer-facing representations must remain identical.

```text
Website

=

PDF

=

Apple Wallet

=

Google Wallet

=

Staff Scanner
```

The QR always identifies the same Ticket.

---

# Ticket Revocation

Future administrative actions may revoke tickets.

Flow:

```text
VALID

↓

REVOKED
```

Revoked tickets fail validation immediately.

---

# Ticket Reissue

Future functionality.

Flow:

```text
Old Ticket

↓

Reissued

↓

New QR Version

↓

Old Version Invalid
```

This preserves auditability.

---

# Ticket Integrity Rules

- One Ticket belongs to one Order.
- One Ticket belongs to one Event.
- One Ticket owns one QR identity.
- One accepted Checkin per Ticket.
- History is immutable.
- Signatures are never regenerated without explicit reissue.

---

# Future Ticket Models

Future entities may include:

```text
WalletPass

PdfExport

TicketTransfer

SeatAssignment

TicketAttachment

TicketAccessRule

TicketBenefit
```

---

# Ticket Engine Principles

The Ticket Engine is designed to be:

- Stateless
- Deterministic
- Idempotent
- Auditable
- Provider-independent
- Shared across every Flux Tickets application

Every validation should produce the same result regardless of whether it originates from the Consumer Portal, Staff PWA, Dashboard, Wallet, or PDF.

---

# Next Section

Part 5 documents the **Infrastructure Domain**, including:

- AuditLog
- OutboxEvent
- BullMQ Integration
- Queue Registry
- Dead-Letter Queues
- Redis
- Idempotency
- Distributed Locks
- Observability
---

# Part 5 — Infrastructure Domain

The Infrastructure Domain provides the foundation that guarantees reliability, consistency, observability, and asynchronous processing across the entire platform.

Unlike business domains, these entities are not exposed directly to consumers.

Instead, they support every other domain.

---

# Responsibilities

Infrastructure is responsible for:

- Audit Trail
- Event Publishing
- Queue Processing
- Idempotency
- Distributed Locks
- Background Workers
- Retry Policies
- Dead-Letter Queues
- Health Monitoring
- Observability

---

# Domain Overview

```text
Business Transaction

↓

AuditLog

↓

OutboxEvent

↓

BullMQ Queue

↓

Worker

↓

External Action
```

---

# AuditLog

AuditLog records every important business action.

Unlike TicketStatusHistory, AuditLog records **who**, **when**, **why**, and **how** an action occurred.

---

## Fields

```text
id

entityType

entityId

action

reason

requestId

userId

metadata

createdAt
```

---

## Relationships

AuditLog is intentionally generic.

It may reference:

- Ticket
- Order
- Payment
- Reservation
- Event
- Checkin
- Organizer

through:

```text
entityType

entityId
```

---

## Example Actions

```text
RESERVATION_CREATED

PAYMENT_APPROVED

PAYMENT_REJECTED

TICKET_ISSUED

CHECKIN_ACCEPTED

CHECKIN_REJECTED

CHECKIN_CONFLICT

WEBHOOK_RECEIVED

WAITLIST_JOINED
```

---

## Rules

Audit records:

- are append-only
- are never updated
- are never deleted
- may include structured metadata

---

## Indexes

```text
AuditLog.entityId

AuditLog.entityType

AuditLog.action

AuditLog.createdAt

AuditLog.requestId
```

Composite:

```text
(entityType, entityId)

(requestId, createdAt)
```

---

# OutboxEvent

Implements the Transactional Outbox Pattern.

It guarantees reliable asynchronous execution.

---

## Fields

```text
id

type

aggregateType

aggregateId

payload

status

attempts

nextRunAt

processedAt

requestId

createdAt
```

---

## Relationships

Conceptually:

```text
Business Entity

↓

OutboxEvent
```

No hard foreign keys are required.

---

## Status

```text
PENDING

PROCESSING

PROCESSED

FAILED
```

---

## Rules

An OutboxEvent:

- is created inside the same transaction as the business mutation
- is processed only after commit
- may be retried
- is never processed twice

---

## Lifecycle

```text
Business Transaction

↓

OutboxEvent

↓

Queue

↓

Worker

↓

Processed
```

---

## Retry Lifecycle

```text
Pending

↓

Failed

↓

Retry

↓

Retry

↓

Retry

↓

Dead Letter
```

---

## Indexes

```text
OutboxEvent.status

OutboxEvent.type

OutboxEvent.nextRunAt

OutboxEvent.createdAt
```

Composite:

```text
(status, nextRunAt)
```

---

# Queue Registry

All asynchronous jobs are registered centrally.

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

---

# Worker Responsibilities

Workers execute asynchronous business operations.

Examples:

```text
Payment Recovery

↓

Ticket Issue

↓

Analytics

↓

Notifications

↓

Waitlist Invitations
```

Workers never bypass business rules.

---

# Dead-Letter Queue

Every queue has a matching dead-letter queue.

Example:

```text
payments.webhook

↓

payments.webhook.dead
```

---

## Dead-Letter Rules

Jobs are moved only after all retries fail.

Dead-letter jobs retain:

- sanitized payload
- attempts
- failure reason
- queue name
- requestId

---

# Retry Strategy

Default BullMQ configuration:

```text
attempts = 5

↓

Exponential Backoff

↓

Dead Letter
```

Retry intervals may vary by queue.

---

# Distributed Locks

Redis provides distributed locking.

Current lock types include:

- Reservation Lock
- Payment Approval Lock
- Worker Processing Lock

Future locks may include:

- Seat Reservation
- Settlement Processing

---

# Redis

Redis responsibilities:

- Reservation inventory
- Distributed locks
- Queue backend
- Temporary state

Redis is **not** the source of truth.

The database remains authoritative.

---

# Idempotency

Infrastructure guarantees exactly-once business effects.

Protected operations include:

- Payment approval
- Ticket issuance
- Webhook processing
- Check-in synchronization
- Worker retries

---

## Idempotency Keys

Current identifiers include:

```text
providerEventId

providerPaymentId

idempotencyKey

requestId

offlineId
```

These prevent duplicate processing.

---

# Concurrency

Infrastructure supports high-concurrency environments.

Examples:

```text
50 simultaneous approvals

↓

1 Payment

↓

1 Order

↓

1 Ticket

↓

1 History
```

and

```text
100 Staff devices

↓

Offline validation

↓

Conflict resolution
```

---

# Monitoring

Infrastructure exposes operational endpoints.

```http
GET /health/live

GET /health/ready

GET /metrics

GET /monitoring/queues

GET /version
```

---

# Health Checks

Readiness verifies:

- Database
- Redis
- Queue availability

Liveness verifies:

- Process health

---

# Metrics

Metrics include:

```text
HTTP Requests

Latency

Redis

Database

BullMQ

Business Counters
```

Prometheus-compatible output is optional.

---

# Structured Logging

All services use structured Pino logging.

Common fields include:

```text
requestId

service

route

statusCode

latency

queueName

jobId
```

Sensitive values are automatically redacted.

---

# Sentry

Optional Sentry integration captures:

- Unhandled exceptions
- Worker failures
- Rejected promises
- Queue failures

Initialization is controlled by:

```text
SENTRY_DSN
```

---

# Request Traceability

Every request is traceable across services.

Flow:

```text
HTTP Request

↓

requestId

↓

AuditLog

↓

OutboxEvent

↓

Queue Job

↓

Worker Logs

↓

Completion
```

---

# Queue Integrity Rules

Workers must be:

- idempotent
- retry-safe
- stateless
- deterministic

Running the same job twice must never create duplicate business effects.

---

# Infrastructure Security

Infrastructure never stores:

- JWT secrets
- HMAC secrets
- Provider credentials
- Card numbers
- CVV
- Access tokens

Secrets remain in environment variables.

---

# Performance Principles

Infrastructure favors:

- small transactions
- asynchronous work
- deterministic retries
- bounded queue sizes
- predictable latency

---

# Future Infrastructure Models

Potential future entities include:

```text
Notification

EmailLog

SmsLog

WebhookDelivery

RateLimitBucket

ApiKey

BackgroundJob

SystemSetting
```

These integrate without affecting business domains.

---

# Infrastructure Principles

The Infrastructure Domain exists to guarantee that:

- every transaction is auditable
- every asynchronous event is recoverable
- every retry is safe
- every failure is observable
- every business action can be traced

Business logic remains isolated while infrastructure ensures reliability.

---

# Next Section

Part 6 documents **Data Integrity & Future Evolution**, including:

- Constraints
- Foreign Keys
- Cascades
- Lock Strategy
- Migration Strategy
- Analytics Models
- Financial Models
- Marketing Models
- Administrative Models
- Long-term Database Roadmap
---

# Part 6 — Data Integrity & Future Evolution

The final section documents the long-term integrity guarantees of the Flux Tickets database.

Unlike previous sections that describe entities, this chapter defines the rules that ensure the database remains consistent as the platform grows.

---

# Database Integrity Philosophy

Every business rule should exist in one of three places:

- Database Constraint
- Transaction Boundary
- Business Service

The frontend is never responsible for maintaining data integrity.

---

# Integrity Layers

Flux Tickets protects data through multiple layers.

```text
Frontend Validation

↓

API Validation

↓

Business Rules

↓

Database Constraints

↓

Transactions

↓

Audit
```

Each layer complements the previous one.

---

# Primary Keys

Every persistent entity uses UUID.

Example:

```text
Ticket.id

Reservation.id

Payment.id

Order.id
```

Benefits:

- globally unique
- replication friendly
- queue friendly
- public identifier safe

---

# Foreign Keys

Relationships are always explicit.

Example:

```text
Ticket

↓

Order

↓

Reservation

↓

Event

↓

Organizer
```

No entity should rely on implicit relationships.

---

# Required Relationships

Examples:

A Ticket:

must reference

```text
Order

Event

TicketBatch
```

A Payment:

must reference

```text
Order
```

A ReservationItem:

must reference

```text
Reservation

TicketBatch
```

---

# Cascading Rules

Flux Tickets intentionally avoids destructive cascade deletes.

Preferred strategy:

```text
Delete

❌
```

Instead:

```text
Deactivate

↓

Cancel

↓

Revoke
```

Historical records must remain available.

---

# Immutable Entities

The following entities are append-only:

```text
AuditLog
```

```text
TicketStatusHistory
```

Business history must never be rewritten.

---

# Mutable Entities

Entities that naturally evolve include:

```text
Reservation

Payment

Order

Ticket
```

Even when mutable, every important transition generates history.

---

# State Machines

Every business entity follows explicit state transitions.

Example:

Reservation

```text
ACTIVE

↓

COMPLETED
```

or

```text
ACTIVE

↓

EXPIRED
```

Illegal transitions are rejected.

---

# Payment State Machine

```text
PENDING

↓

APPROVED
```

or

```text
PENDING

↓

FAILED
```

or

```text
PENDING

↓

EXPIRED
```

Completed payments never return to pending.

---

# Ticket State Machine

```text
PENDING

↓

VALID

↓

CONSUMED
```

Alternative transitions:

```text
VALID

↓

REVOKED
```

```text
VALID

↓

REFUNDED
```

---

# Transaction Strategy

Business transactions should remain short.

Typical transaction:

```text
Reserve Inventory

↓

Create Order

↓

Create Payment

↓

Create Outbox

↓

Commit
```

Long-running work is delegated to workers.

---

# Lock Strategy

Critical write operations use locking.

Current lock categories:

```text
Reservation

Payment Approval

Worker Processing

Check-in Synchronization
```

Future additions:

```text
Seat Reservation

Settlement

Refund Processing
```

---

# Optimistic vs Pessimistic Locking

The platform uses both strategies.

Optimistic:

- version checks
- status validation

Pessimistic:

- payment approval
- ticket issuance
- check-in acceptance

The goal is preventing duplicate business effects.

---

# Concurrency Guarantees

The platform is designed to support:

```text
50 simultaneous approvals

↓

1 Payment Approved

↓

1 Ticket Issued

↓

1 History Transition
```

Likewise:

```text
100 Staff Devices

↓

Offline Validation

↓

One Accepted Checkin
```

Duplicate attempts become no-ops.

---

# Unique Constraints

Examples include:

```text
User.email

Event.slug

Payment.providerPaymentId

Payment.providerEventId

Payment.idempotencyKey

Accepted Checkin(ticketId)
```

These constraints reinforce business idempotency.

---

# Composite Indexes

Composite indexes support the most common queries.

Examples:

```text
Reservation(status, expiresAt)

Payment(status, createdAt)

TicketBatch(eventId, status)

OutboxEvent(status, nextRunAt)
```

Indexes should reflect production query patterns.

---

# Data Retention

Transactional data should remain indefinitely.

Examples:

- Orders
- Payments
- Tickets
- Check-ins
- AuditLog

Temporary data may be removed according to retention policies.

Examples:

- expired reservations
- temporary cache
- obsolete worker metadata

---

# Migration Strategy

Schema evolution follows additive migrations.

Preferred approach:

```text
New Column

↓

Compatibility Layer

↓

Deploy

↓

Migrate Data

↓

Remove Legacy
```

Breaking schema changes should never be deployed directly to production.

---

# Backward Compatibility

Public APIs should remain compatible while database migrations occur.

Legacy columns may coexist temporarily.

Only after all services migrate should obsolete structures be removed.

---

# Database Versioning

Every migration receives a timestamp.

Example:

```text
20260619000600_phase6a_payment_core
```

Migration names describe business intent instead of implementation details.

---

# Analytics Evolution

Current dashboard metrics are calculated from transactional tables.

Future optimization includes dedicated analytics models.

Possible tables:

```text
DashboardMetric

EventMetric

RevenueMetric

LotMetric

DailySales
```

These tables reduce dashboard query complexity.

---

# Financial Evolution

Future financial modules may introduce:

```text
Settlement

Transfer

Payout

Refund

Chargeback

Invoice
```

These entities integrate naturally with Orders and Payments.

---

# Marketing Evolution

Planned marketing entities:

```text
Coupon

Campaign

Promotion

Affiliate

Promoter

TrackingLink

PixelEvent

UTMAttribution
```

They enrich checkout without affecting core ticket issuance.

---

# Consumer Evolution

Future customer features may include:

```text
FavoriteEvent

NotificationPreference

SavedPaymentMethod

CustomerDocument

SupportRequest
```

---

# Staff Evolution

Planned Staff entities:

```text
DeviceRegistration

StaffSession

ScannerConfiguration

OfflineBundleVersion

ManualValidation

AccessRule
```

These improve operational control while preserving offline support.

---

# Administrative Evolution

Future administrative models:

```text
AdminUser

OrganizerApproval

SystemConfiguration

GlobalAudit

PlatformAnnouncement

MaintenanceWindow
```

These support platform-wide operations.

---

# LGPD Evolution

Future compliance models:

```text
Consent

PrivacyRequest

DataExport

DataDeletion

LegalRetention
```

These provide regulatory compliance without changing business flows.

---

# Scalability Strategy

The database is designed to evolve through:

- additional indexes
- read replicas
- materialized views
- aggregation tables
- partitioning (if necessary)

No immediate sharding strategy is planned.

---

# Disaster Recovery

Production deployments should support:

- automated backups
- point-in-time recovery
- rollback procedures
- migration rollback plans
- periodic restore testing

---

# Long-Term Goals

The database should support:

- millions of tickets
- millions of check-ins
- multiple organizers
- concurrent nationwide events
- independent worker scaling
- provider replacement without schema redesign

---

# Architectural Principles Recap

The Flux Tickets database is built upon these principles:

- Domain-driven design
- Backend as the source of truth
- Immutable business history
- Explicit relationships
- Idempotent processing
- Reliable asynchronous execution
- High concurrency
- Auditability
- Observability
- Horizontal scalability

---

# Database Documentation Complete

This document now covers:

- Overview
- Identity & Catalog
- Checkout
- Ticket Engine
- Infrastructure
- Data Integrity & Future Evolution