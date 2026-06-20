# Business Rules

> Version: 2.0
> Last Updated: June 2026

---

# Overview

This document defines the business rules that govern every core operation within Flux Tickets.

Business rules describe platform behavior independently of implementation details.

Whenever there is a conflict between implementation and this document, this document represents the intended business behavior.

---

# Principles

The platform follows these principles:

- PostgreSQL is the source of truth.
- Business rules execute on the backend.
- Frontend never makes business decisions.
- All critical operations are auditable.
- Every business operation is idempotent whenever possible.
- Every ticket has exactly one owner.
- Every ticket has exactly one lifecycle.

---

# Event Rules

## Event Ownership

Every Event belongs to exactly one Organizer.

```text
Organizer

↓

1..N Events
```

Events cannot be transferred between organizers.

---

## Event Visibility

Events may be:

```text
Draft

Published

Cancelled

Archived
```

Only Published events are visible to customers.

---

## Event Capacity

Event capacity is the sum of all available ticket batches.

Capacity cannot become negative.

---

## Event Cancellation

Cancelling an Event:

- prevents new reservations
- prevents new payments
- preserves historical tickets
- preserves AuditLog
- preserves Check-ins

Existing financial records are never deleted.

---

# Ticket Batch Rules

Every TicketBatch belongs to exactly one Event.

Each batch defines:

- quantity
- sales period
- price
- visibility
- optional sector

---

## Sales Window

A TicketBatch is purchasable only if:

```text
Current Date

>= startsAt

AND

<= endsAt
```

Otherwise checkout is rejected.

---

## Inventory

Inventory is calculated as:

```text
Total Quantity

-

Reserved

-

Sold
```

Inventory may never become negative.

---

## Sold Out

A batch becomes Sold Out when:

```text
Available Inventory == 0
```

Customers may then join the waitlist.

---

# Reservation Rules

Reservations temporarily lock inventory.

Purpose:

Prevent overselling during checkout.

---

## Reservation Duration

Default reservation time:

```text
10 minutes
```

After expiration:

```text
Reservation

↓

EXPIRED

↓

Inventory Released
```

---

## Reservation Ownership

A Reservation belongs to exactly one customer session.

Reservations cannot be transferred.

---

## Reservation Expiration

Expired reservations:

- cannot be paid
- cannot be recovered
- automatically release inventory

---

## Reservation Extension

Reservations are never automatically extended.

Future versions may support manual extension for administrators.

---

# Order Rules

Every successful checkout creates exactly one Order.

Orders reference:

- Customer
- Reservation
- Payment
- Tickets

---

## Order States

```text
PENDING

PAID

EXPIRED

CANCELLED
```

Transitions are irreversible unless explicitly supported.

---

# Payment Rules

Payments belong to exactly one Order.

Each Order may have multiple Payment attempts.

Only one Payment may become APPROVED.

---

## Payment Approval

Approved payment immediately triggers:

```text
Payment APPROVED

↓

Order PAID

↓

Ticket Issue

↓

AuditLog

↓

TicketStatusHistory
```

---

## Payment Failure

Rejected payments:

- keep reservation until expiration
- allow new payment attempts
- never issue tickets

---

## Payment Expiration

Expired payments:

```text
Payment EXPIRED

↓

Reservation Released

↓

Inventory Returned
```

---

## Pending Payments

Pending payments may be recovered by:

```text
payments.recoverPending
```

Worker.

---

# Ticket Rules

Tickets are issued only after:

```text
Payment APPROVED
```

No exceptions.

---

## Ticket Identity

Every ticket has:

- immutable ID
- immutable QR identity
- immutable owner

Ownership changes require a future Transfer flow.

---

## Ticket Status

Current statuses:

```text
ISSUED

CHECKED_IN

CANCELLED
```

Future statuses may include:

```text
TRANSFERRED

REFUNDED
```

---

## Ticket Issue

Ticket issuing creates:

- Ticket
- QR Payload
- TicketStatusHistory
- AuditLog

All inside one business transaction.

---

## Ticket Ownership

Each Ticket belongs to exactly one Order.

Each Order belongs to exactly one Customer.

---

## QR Rules

The QR Code contains:

- ticketId
- qrVersion
- signature

The QR Code never contains:

- customer name
- CPF
- payment data
- order value

---

## QR Validation

A QR is valid only if:

- signature is valid
- ticket exists
- ticket is active
- ticket has not already been consumed

---

# Ticket Consumption

Once successfully checked in:

```text
Ticket

↓

CHECKED_IN
```

The same ticket cannot be accepted twice.

Duplicate scans return an informational response.

---

# Customer Rules

A Customer may:

- own multiple Orders
- own multiple Tickets
- join multiple Waitlists

Customers never directly modify issued Tickets.

---

# Business Rule Priority

Whenever multiple rules apply simultaneously:

Priority order:

```text
Security

↓

Payment

↓

Inventory

↓

Ticket

↓

Notification
```

Security validations always execute first.

---

# Next Section

Part 2 covers:

- Waitlist
- Offline Validation
- Staff Operations
- Check-ins
- Notifications
- Analytics
- Refunds
- Future Business Rules

---
---

# Waitlist Rules

The Waitlist allows customers to express interest in sold-out Ticket Batches.

Joining the Waitlist does **not** reserve inventory.

---

## Eligibility

A customer may join a Waitlist only if:

- the TicketBatch exists;
- the TicketBatch is sold out;
- the Event is still active.

---

## Duplicate Entries

A customer may have only one active WaitlistEntry per TicketBatch.

Duplicate entries are rejected.

---

## Invitation Order

Inventory is offered using a FIFO policy.

```text
First Joined

↓

First Invited
```

Future versions may support priority groups.

---

## Invitation Expiration

A Waitlist invitation expires after a configurable period.

Default:

```text
24 hours
```

Expired invitations automatically return inventory to the next eligible customer.

---

## Inventory Recovery

Inventory may become available through:

- Reservation expiration
- Order cancellation
- Administrative release
- Future ticket transfer cancellation

Recovered inventory immediately triggers:

```text
waitlist.invite
```

---

# Check-in Rules

A Ticket may only be checked in once.

Successful validation creates:

- Checkin
- TicketStatusHistory
- AuditLog

---

## Check-in Validation

Before accepting a Ticket, the system validates:

- QR signature
- Ticket existence
- Ticket ownership
- Ticket status
- Previous check-in
- Event validity

Every validation must succeed.

---

## Duplicate Check-ins

Duplicate scans never create additional Checkin records.

The Staff application should return an informational message indicating that the Ticket has already been consumed.

---

## Offline Check-ins

Offline validation follows the same business rules as online validation.

Accepted scans are temporarily stored in IndexedDB.

Synchronization occurs once connectivity is restored.

---

## Synchronization

Offline synchronization is idempotent.

Submitting the same Check-in multiple times must never create duplicate records.

---

## Conflict Resolution

If two devices submit the same Ticket:

```text
First Valid Check-in

↓

Accepted
```

```text
Subsequent Check-ins

↓

Rejected
```

The database remains the final authority.

---

# Staff Rules

Staff members validate Tickets.

They cannot:

- edit Orders;
- approve Payments;
- modify Tickets;
- change inventory.

---

## Staff Identification

For the MVP, Staff members identify themselves using:

- Full Name
- CPF

Authentication is intentionally omitted.

Every Check-in stores the operator information for auditing purposes.

---

## Future Authentication

Future versions will replace Name + CPF with authenticated Staff accounts using JWT.

Historical Check-ins remain linked to the original operator.

---

# Notification Rules

Notifications are asynchronous.

Business operations never wait for notification delivery.

---

## Notification Events

Current notification triggers include:

- Ticket issued
- Waitlist invitation
- Future refund confirmation
- Future Event reminder

Notification failures never rollback business transactions.

---

# Analytics Rules

Analytics are always derived from transactional data.

Analytics never modify business state.

---

## Dashboard

Dashboard calculations belong exclusively to the backend.

Frontend applications only render the returned data.

---

## Priority Event

Exactly one Event may be considered the Priority Event at any given moment.

Selection is determined by the Analytics engine.

---

## KPI Ownership

KPIs are calculated from:

- Orders
- Payments
- Tickets
- Check-ins
- Reservations

Manual values are never accepted.

---

# Audit Rules

Every critical business operation creates an AuditLog entry.

Examples include:

- Reservation created
- Reservation expired
- Payment approved
- Payment failed
- Ticket issued
- Ticket cancelled
- Waitlist joined
- Waitlist invitation sent
- Check-in accepted

Audit records are immutable.

---

# Ticket History Rules

Every Ticket lifecycle transition creates a TicketStatusHistory record.

Example:

```text
ISSUED

↓

CHECKED_IN
```

Future transitions include:

```text
TRANSFERRED

REFUNDED

REVOKED
```

Ticket history is append-only.

---

# Refund Rules (Future)

Refunds will follow these principles:

- Refunds never delete Tickets.
- Refunds create new business events.
- Refunds generate AuditLog entries.
- Refunds preserve financial history.

Future statuses:

```text
REFUND_REQUESTED

REFUNDED

PARTIALLY_REFUNDED
```

---

# Transfer Rules (Future)

Ticket transfer will:

- preserve Ticket identity;
- preserve Ticket history;
- change ownership only;
- generate AuditLog entries.

QR identity may remain unchanged or be regenerated depending on future security requirements.

---

# Administrative Rules

Administrators may:

- create Events;
- cancel Events;
- release inventory;
- manually issue invitations;
- override selected business operations.

Administrative overrides always generate AuditLog entries.

---

# Security Rules

Business operations execute in the following order:

```text
Authentication

↓

Authorization

↓

Business Validation

↓

Persistence

↓

Audit

↓

Outbox
```

Every mutation follows this sequence.

---

# Consistency Rules

The platform guarantees:

- Every Ticket belongs to exactly one Order.
- Every Order belongs to exactly one Customer.
- Every Check-in belongs to exactly one Ticket.
- Every Ticket has exactly one active owner.
- Every approved Payment issues Tickets exactly once.
- Every asynchronous operation originates from an OutboxEvent.
- Every critical operation is auditable.

---

# Business Invariants

The following conditions must always remain true:

- Inventory may never become negative.
- Tickets may never exist without an Order.
- Orders may never exist without a Reservation.
- Approved Payments may never issue duplicate Tickets.
- Check-ins may never be duplicated.
- QR signatures must always validate.
- PostgreSQL remains the source of truth.

Violation of any invariant indicates a platform defect.

---

# Future Business Rules

Planned additions include:

- Coupons
- Promotional Codes
- Ticket Transfers
- Refunds
- Chargebacks
- Dynamic Pricing
- Membership Programs
- Affiliate Sales
- Reserved Seating
- Subscription Events

Each feature will extend this document without altering existing business rules.

---

# Business Rules Complete

Together, Parts 1 and 2 define the complete business behavior of Flux Tickets, covering events, inventory, reservations, payments, ticket issuance, check-ins, waitlists, analytics, auditing, notifications, and future platform capabilities.

---
