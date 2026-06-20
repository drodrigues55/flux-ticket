# Flux Tickets Documentation Changelog

## Documentation Sync — Architecture Update (Phases 4A → 6A)

This documentation update consolidates all architectural decisions implemented from Phase 4A through Phase 6A, aligning the documentation with the current backend implementation and establishing the foundation for the upcoming Ticket Engine (Phase 6B) and Staff Experience (Phase 6C).

---

# Added

## Core Domain

* Reservation-first checkout flow.
* Reservation and ReservationItem as canonical checkout records.
* Order as payment aggregate root.
* TicketStatusHistory lifecycle tracking.
* WaitlistEntry model.
* PaymentProvider abstraction.
* Provider-ready payment fields.
* TicketDTO concept.
* StaffSession concept.
* Device identity concept.

---

## Payment Architecture

* PaymentProvider interface.
* MockPaymentProvider implementation.
* Provider-agnostic payment flow.
* Provider status mapping.
* Pending payment recovery flow.
* Payment idempotency strategy.
* Webhook idempotency strategy.
* Provider metadata persistence.
* Recovery workers.
* Abandoned reservation lifecycle.

---

## Ticket Architecture

* Canonical Ticket lifecycle.
* Ticket Engine architecture.
* QR Protocol specification.
* QR versioning.
* HMAC-based ticket signatures.
* Shared TicketDTO contract.
* Single QR shared across:

  * Website
  * PDF
  * Apple Wallet
  * Google Wallet
* Ticket validation pipeline.
* Online/offline validation strategy.

---

## Staff Platform

* Canonical offline bundle.
* Staff check-in synchronization.
* Duplicate detection.
* Offline conflict handling.
* StaffSession lifecycle.
* Local Operator concept.
* Device registration concept.
* Offline queue synchronization.
* Audit integration.
* TicketStatusHistory integration.

---

## Dashboard

* Backend-driven dashboard.
* Aggregated dashboard endpoints.
* Priority event endpoint.
* Event priority ranking.
* Lots performance endpoint.
* Operational alerts endpoint.
* Stable backend contracts.
* Frontend rendering-only architecture.

---

## Queue Architecture

Added documented queues:

* payments.webhook
* payments.recoverPending
* tickets.issue
* halfPrice.validateDeadline
* checkins.sync
* analytics.aggregate
* carts.expireAbandoned
* waitlist.invite
* notifications.placeholder

Documented:

* retry policy
* exponential backoff
* dead-letter queues
* outbox publishing
* queue monitoring

---

## Observability

Added documentation for:

* Request IDs
* Structured logging (Pino)
* Sentry integration
* Prometheus metrics
* Queue monitoring
* Version endpoint
* Health endpoints
* Readiness checks

---

# Updated

## Domain Model

Updated entities:

* User
* Organizer
* Event
* Venue
* Sector
* TicketBatch
* Reservation
* ReservationItem
* Order
* Payment
* Ticket
* TicketStatusHistory
* Checkin
* AuditLog

Added future entities:

* StaffSession
* WaitlistEntry
* DashboardAlert
* DashboardEventMetric

---

## Ticket Lifecycle

Expanded lifecycle:

Reservation

↓

Order

↓

Payment

↓

Ticket

↓

Ticket Engine

↓

QR Generation

↓

Website

↓

PDF

↓

Apple Wallet

↓

Google Wallet

↓

Staff Scanner

↓

Ticket Validation

↓

Check-in

↓

History

↓

Audit

---

## Database

Updated schema documentation with:

* Payment provider metadata
* Waitlist
* Ticket versioning
* QR signature
* StaffSession
* Checkin improvements
* Dashboard analytics
* Queue support
* Audit improvements

---

## API Contracts

Updated contracts for:

* Reservation
* Checkout
* Payment
* Webhooks
* Dashboard
* Staff Platform
* Offline Bundle
* Check-in Sync
* Waitlist
* Payment Recovery

Documented standardized response envelopes:

Success

```json
{
  "data": {},
  "meta": {
    "requestId": "req_xxx"
  }
}
```

Error

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

## Consumer Portal

Added documentation for:

* Ticket page
* QR rendering
* Wallet download
* PDF download
* Payment status
* Pending payment recovery
* Waitlist

---

# New Documents

The following documentation should be introduced:

* offline-validation.md
* ticket-engine.md
* staff-pwa.md

---

# Future Documentation (Phase 6B)

Planned additions:

* Ticket Engine internals
* QR Generator
* QR Parser
* TicketDTO
* Wallet generation
* PDF generation
* Validation engine
* Offline validation engine
* Website ticket rendering

---

# Future Documentation (Phase 6C)

Planned additions:

* Staff onboarding
* Local operator registration
* Device registration
* Bundle download
* Scanner UX
* Validation screen
* Continuous scan mode
* Offline queue
* Synchronization flow
* Staff dashboard

---

# Documentation Principles

The documentation now follows these principles:

* Backend is the source of truth.
* Frontend renders backend data only.
* Business logic is centralized.
* Payment providers are replaceable.
* Ticket validation is centralized in the Ticket Engine.
* QR Codes never contain business data.
* Wallets, PDF, Website, and Staff use the exact same QR payload.
* Offline validation follows the same rules as online validation.
* All sensitive actions are auditable.
* Every dashboard metric originates from the database or backend aggregation.
* APIs are deterministic, idempotent, and versionable.

---

# Current Documentation Status

| Area                  | Status                |
| --------------------- | --------------------- |
| Domain                | ✅ Updated             |
| Backend               | ✅ Updated             |
| Payment Engine        | ✅ Updated             |
| Dashboard             | ✅ Updated             |
| Queue Architecture    | ✅ Updated             |
| Observability         | ✅ Updated             |
| Ticket Engine         | 🚧 Planned (Phase 6B) |
| Staff Experience      | 🚧 Planned (Phase 6C) |
| Wallet Integration    | 🚧 Planned            |
| Mercado Pago Provider | 🚧 Planned            |
| PDF Generation        | 🚧 Planned            |

---

**Documentation Version**

Version: **2.0.0**

Last Updated: **June 2026**

Applies to implementation through **Phase 6A**.
