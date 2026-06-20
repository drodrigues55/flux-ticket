# Service Map

> Version: 2.0  
> Last Updated: June 2026

---

# Overview

This document maps how Flux Tickets applications, backend services, workers, databases, queues, and external providers communicate with each other.

It is intended to be the fastest way to understand how the platform works from end to end.

---

# High-Level System Map

```text
                         ┌──────────────────────┐
                         │   Consumer Portal    │
                         │     apps/client      │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP
                                    ▼
                         ┌──────────────────────┐
                         │       api-read       │
                         │ public catalog/data  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      PostgreSQL      │
                         │   source of truth    │
                         └──────────────────────┘


                         ┌──────────────────────┐
                         │ Organizer Dashboard  │
                         │   apps/dashboard     │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP
                                    ▼
                         ┌──────────────────────┐
                         │       api-read       │
                         │ dashboard analytics  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      PostgreSQL      │
                         └──────────────────────┘


                         ┌──────────────────────┐
                         │      Staff PWA       │
                         │   apps/staff-pwa     │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
      ┌──────────────────────┐              ┌──────────────────────┐
      │      IndexedDB       │              │       api-write      │
      │ offline validation   │              │ check-in sync        │
      └──────────────────────┘              └──────────┬───────────┘
                                                        │
                                                        ▼
                                             ┌──────────────────────┐
                                             │      PostgreSQL      │
                                             └──────────────────────┘
```

---

# Core Services

| Service | Path | Responsibility |
|---|---|---|
| Consumer Portal | `apps/client` | Public event discovery, checkout, tickets |
| Organizer Dashboard | `apps/dashboard` | Organizer analytics and management |
| Staff PWA | `apps/staff-pwa` | Offline ticket validation and check-ins |
| api-read | `services/api-read` | Public reads, dashboard data, offline bundles |
| api-write | `services/api-write` | Business mutations, checkout, payments, check-ins |
| ticket-worker | `services/ticket-worker` | Queues, recovery, ticket issuing, background jobs |
| PostgreSQL | external | Source of truth |
| Redis | external | Queues, locks, reservations, temporary state |

---

# Read Flow

Used by catalog, dashboard, ticket views, and offline bundles.

```text
Application

↓

api-read

↓

PostgreSQL

↓

api-read

↓

Application
```

Examples:

```text
Consumer Portal

↓

GET /events

↓

api-read

↓

PostgreSQL
```

```text
Organizer Dashboard

↓

GET /dashboard/overview

↓

api-read

↓

PostgreSQL
```

```text
Staff PWA

↓

GET /staff/events/:eventId/offline-bundle

↓

api-read

↓

PostgreSQL
```

---

# Write Flow

Used by reservations, checkout, payments, waitlist, and check-ins.

```text
Application

↓

api-write

↓

Business Transaction

↓

PostgreSQL

↓

OutboxEvent

↓

ticket-worker
```

Examples:

```text
Consumer Portal

↓

POST /tickets/reserve

↓

api-write

↓

Redis + PostgreSQL
```

```text
Consumer Portal

↓

POST /payments/checkout

↓

api-write

↓

Order + Payment
```

```text
Staff PWA

↓

POST /staff/checkins/sync

↓

api-write

↓

Checkin + TicketStatusHistory + AuditLog
```

---

# Checkout Flow

```text
Consumer Portal

↓

Select Tickets

↓

POST /tickets/reserve

↓

api-write

↓

Redis Reservation Lock

↓

Reservation + ReservationItem

↓

POST /payments/checkout

↓

Order + Payment

↓

PaymentProvider

↓

Payment Pending / Approved / Rejected
```

If approved:

```text
Payment Approved

↓

OutboxEvent

↓

tickets.issue

↓

ticket-worker

↓

Ticket Created

↓

TicketStatusHistory

↓

AuditLog
```

---

# Payment Flow

```text
Consumer Portal

↓

Checkout

↓

api-write

↓

Payment Engine

↓

PaymentProvider

↓

MockPaymentProvider / Future MercadoPagoProvider
```

Provider confirmation:

```text
Payment Provider

↓

Webhook

↓

POST /webhooks/mercado-pago

↓

api-write

↓

OutboxEvent

↓

payments.webhook

↓

ticket-worker

↓

Payment Approval

↓

tickets.issue
```

Recovery flow:

```text
Payment PENDING

↓

payments.recoverPending

↓

ticket-worker

↓

PaymentProvider.getPaymentStatus()

↓

Payment Approved / Expired / Failed
```

---

# Ticket Issue Flow

```text
Payment APPROVED

↓

OutboxEvent

↓

tickets.issue

↓

ticket-worker

↓

Ticket Engine

↓

Ticket Created

↓

QR Payload Generated

↓

HMAC Signature

↓

TicketStatusHistory

↓

AuditLog
```

---

# Ticket Delivery Flow

All delivery surfaces use the same ticket identity and QR.

```text
Ticket

↓

Ticket Engine

↓

QR Payload

↓

┌──────────────────────┐
│ Consumer Portal      │
├──────────────────────┤
│ PDF                  │
├──────────────────────┤
│ Apple Wallet         │
├──────────────────────┤
│ Google Wallet        │
└──────────────────────┘
```

The QR never contains business data.

It contains only:

```text
ticketId

qrVersion

signature
```

---

# Staff Offline Flow

Before the event:

```text
Staff PWA

↓

GET /staff/events/:eventId/offline-bundle

↓

api-read

↓

PostgreSQL

↓

Signed Offline Bundle

↓

IndexedDB
```

During the event:

```text
Staff PWA

↓

Scan QR

↓

Ticket Engine Validation

↓

IndexedDB Lookup

↓

Accepted / Rejected

↓

Local Check-in Queue
```

When internet returns:

```text
Local Check-in Queue

↓

POST /staff/checkins/sync

↓

api-write

↓

Conflict Detection

↓

Checkin

↓

TicketStatusHistory

↓

AuditLog
```

---

# Dashboard Flow

```text
Organizer Dashboard

↓

api-read

↓

DashboardService

↓

PostgreSQL

↓

Backend Calculations

↓

Dashboard Response
```

Dashboard endpoints:

```text
GET /dashboard/overview

GET /dashboard/priority-event

GET /dashboard/events-priority

GET /dashboard/events/:eventId/lots-performance

GET /dashboard/alerts
```

Frontend responsibility:

```text
Render only
```

Backend responsibility:

```text
Calculate KPIs
Rank events
Generate alerts
Aggregate metrics
```

---

# Queue Flow

```text
Business Transaction

↓

OutboxEvent

↓

Outbox Publisher

↓

BullMQ

↓

ticket-worker

↓

Business Service

↓

PostgreSQL
```

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

Every queue has a matching dead-letter queue.

Example:

```text
payments.webhook

↓

payments.webhook.dead
```

---

# Waitlist Flow

```text
Batch Sold Out

↓

Consumer Portal

↓

POST /events/:eventId/batches/:batchId/waitlist

↓

api-write

↓

WaitlistEntry
```

When inventory returns:

```text
Inventory Available

↓

waitlist.invite

↓

ticket-worker

↓

Invite First Eligible Entry

↓

notifications.placeholder
```

---

# Abandoned Cart Flow

```text
Reservation ACTIVE

↓

expiresAt reached

↓

carts.expireAbandoned

↓

ticket-worker

↓

Reservation ABANDONED

↓

Inventory Released

↓

AuditLog

↓

OutboxEvent
```

---

# Observability Flow

```text
HTTP Request

↓

Request ID

↓

api-read / api-write

↓

AuditLog

↓

OutboxEvent

↓

BullMQ Job

↓

ticket-worker

↓

Structured Logs
```

Operational endpoints:

```text
GET /health/live

GET /health/ready

GET /version

GET /metrics

GET /monitoring/queues
```

---

# Data Ownership Map

| Data | Owner |
|---|---|
| Event Catalog | api-read |
| Reservations | api-write |
| Orders | api-write |
| Payments | api-write |
| Tickets | Ticket Engine |
| Check-ins | Staff Platform |
| Dashboard Metrics | api-read |
| Queues | ticket-worker |
| AuditLog | api-write / ticket-worker |
| OutboxEvent | api-write / ticket-worker |

---

# External Providers

Current:

```text
MockPaymentProvider
```

Future:

```text
MercadoPagoProvider

Email Provider

WhatsApp Provider

Apple Wallet

Google Wallet
```

External providers are always behind internal abstractions.

---

# Service Dependency Map

```text
apps/client
    ├── api-read
    └── api-write

apps/dashboard
    └── api-read

apps/staff-pwa
    ├── api-read
    ├── api-write
    └── IndexedDB

services/api-read
    └── PostgreSQL

services/api-write
    ├── PostgreSQL
    ├── Redis
    └── OutboxEvent

services/ticket-worker
    ├── PostgreSQL
    ├── Redis
    └── BullMQ
```

---

# Rules

- Frontend never accesses the database directly.
- Dashboard never calculates business KPIs.
- Payment approval never comes from the frontend.
- Tickets are issued only after approved payment.
- QR Codes never contain business data.
- Staff PWA must work offline.
- Redis is never the source of truth.
- PostgreSQL is always the source of truth.
- Workers must be idempotent.
- Every critical mutation must be auditable.

---

# Service Map Complete

This document provides the operational map of Flux Tickets, showing how applications, APIs, workers, queues, providers, storage and observability connect across the platform.

---
---

# Business Interaction Map

This section describes how the platform behaves during each major business workflow.

Unlike the High-Level Service Map, these diagrams focus on business execution rather than infrastructure.

---

# Customer Purchase Flow

```text
Consumer Portal

↓

GET /events

↓

api-read

↓

PostgreSQL

↓

Customer selects Event

↓

POST /tickets/reserve

↓

api-write

↓

Reservation

↓

Redis Lock

↓

ReservationItem

↓

Customer chooses payment

↓

POST /payments/checkout

↓

PaymentProvider

↓

Payment PENDING
```

If approved immediately:

```text
Payment APPROVED

↓

Order PAID

↓

OutboxEvent

↓

tickets.issue

↓

ticket-worker

↓

Ticket Engine

↓

Ticket

↓

QR Payload

↓

Email

↓

Apple Wallet

↓

Google Wallet

↓

Consumer Portal
```

---

# Payment Recovery Flow

```text
Payment

↓

PENDING

↓

payments.recoverPending

↓

ticket-worker

↓

PaymentProvider

↓

Current Provider Status
```

Possible outcomes:

```text
APPROVED

↓

Issue Ticket
```

```text
FAILED

↓

Keep Reservation Until Expiration
```

```text
EXPIRED

↓

Release Inventory
```

---

# Reservation Expiration

```text
Reservation ACTIVE

↓

expiresAt reached

↓

carts.expireAbandoned

↓

ticket-worker

↓

Reservation ABANDONED

↓

Inventory Released

↓

AuditLog
```

---

# Waitlist Flow

```text
Batch Sold Out

↓

Customer joins Waitlist

↓

WaitlistEntry
```

Inventory becomes available:

```text
Cancellation

or

Expired Reservation

↓

Inventory Released

↓

waitlist.invite

↓

ticket-worker

↓

Invitation Generated

↓

Notification

↓

Customer Checkout
```

---

# Ticket Validation (Online)

```text
Staff PWA

↓

Scan QR

↓

ticketId

↓

api-write

↓

Ticket Engine

↓

Validate Signature

↓

Validate Ticket

↓

Validate Check-in

↓

Accept

or

Reject
```

Accepted validation:

```text
Ticket

↓

CHECKED_IN

↓

Checkin

↓

TicketStatusHistory

↓

AuditLog
```

---

# Ticket Validation (Offline)

Before the event:

```text
api-read

↓

Offline Bundle

↓

Staff PWA

↓

IndexedDB
```

During the event:

```text
Scan QR

↓

Signature Validation

↓

IndexedDB Lookup

↓

Business Rules

↓

Accepted

↓

Offline Queue
```

Synchronization:

```text
Internet Available

↓

POST /staff/checkins/sync

↓

api-write

↓

Conflict Detection

↓

Persist Check-ins
```

---

# Ticket Engine Flow

```text
Ticket

↓

Ticket Engine

↓

Generate Payload

↓

Sign Payload

↓

Generate QR

↓

Distribute
```

Distribution targets:

```text
Consumer Portal

PDF

Apple Wallet

Google Wallet
```

All receive the exact same QR payload.

---

# Apple Wallet Flow

```text
Ticket Issued

↓

Ticket Engine

↓

.pkpass

↓

Apple Wallet

↓

Stored Pass

↓

QR Presented
```

The pass does not generate a different ticket.

It references the same Ticket.

---

# Google Wallet Flow

```text
Ticket Issued

↓

Ticket Engine

↓

Wallet Object

↓

Google Wallet

↓

QR Presented
```

Again, the QR payload is identical.

---

# PDF Flow

```text
Ticket Issued

↓

PDF Generator

↓

Embed QR

↓

Send Email

↓

Customer Downloads
```

The PDF does not contain business state.

It only embeds the Ticket Engine QR.

---

# Dashboard Analytics Flow

```text
Organizer Dashboard

↓

GET /dashboard/overview

↓

api-read

↓

Analytics Service

↓

PostgreSQL

↓

Business Aggregation

↓

Dashboard Cards
```

The Dashboard never calculates KPIs.

---

# Notification Flow

```text
Business Event

↓

OutboxEvent

↓

notifications.placeholder

↓

ticket-worker

↓

Email Provider

↓

Customer
```

Future providers:

```text
WhatsApp

SMS

Push Notification
```

---

# Audit Flow

Every critical mutation creates an AuditLog.

```text
Business Transaction

↓

AuditLog

↓

Commit
```

Examples:

```text
Payment Approved

Ticket Issued

Reservation Expired

Check-in Accepted

Waitlist Invitation
```

---

# Queue Dependency Map

```text
payments.webhook
    ↓
    Payment Approval

payments.recoverPending
    ↓
    Payment Recovery

tickets.issue
    ↓
    Ticket Engine

waitlist.invite
    ↓
    Waitlist Processing

analytics.aggregate
    ↓
    Dashboard Metrics

carts.expireAbandoned
    ↓
    Inventory Recovery

checkins.sync
    ↓
    Offline Synchronization

notifications.placeholder
    ↓
    External Providers
```

---

# External Integration Map

```text
Consumer Portal
            │
            ▼
      PaymentProvider
            │
            ▼
MockPaymentProvider
            │
      Future
            │
            ▼
MercadoPagoProvider
```

```text
Ticket Engine
            │
            ├──────────► Apple Wallet
            │
            ├──────────► Google Wallet
            │
            ├──────────► PDF Generator
            │
            └──────────► Consumer Portal
```

---

# Cross-Service Dependencies

```text
api-read
    │
    ├── PostgreSQL
    └── Analytics

api-write
    │
    ├── PostgreSQL
    ├── Redis
    ├── Payment Engine
    ├── Ticket Engine
    └── Outbox

ticket-worker
    │
    ├── BullMQ
    ├── PostgreSQL
    ├── Redis
    └── PaymentProvider

Staff PWA
    │
    ├── IndexedDB
    ├── api-read
    └── api-write

Consumer Portal
    │
    ├── api-read
    └── api-write

Organizer Dashboard
    │
    └── api-read
```

---

# Architectural Guarantees

The platform guarantees:

- PostgreSQL is always the source of truth.
- Redis stores only transient operational state.
- Workers execute asynchronously and must be idempotent.
- Tickets are issued only after approved payment.
- Every ticket has exactly one immutable identity.
- Every delivery channel uses the same QR payload.
- Dashboard metrics are calculated exclusively by the backend.
- Staff validation works both online and offline.
- Every critical business action generates an AuditLog.
- Every asynchronous business action originates from an OutboxEvent.

---

# Service Map Complete

Together, Parts 1 and 2 describe both the structural architecture and the runtime interaction between every application, backend service, queue, worker, storage layer, and external integration in the Flux Tickets platform.

---
