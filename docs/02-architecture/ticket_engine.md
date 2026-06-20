# Ticket Engine

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Ticket Engine is the central component responsible for issuing, validating, and managing tickets across the Flux Tickets platform.

Unlike the Checkout domain, which manages purchases, the Ticket Engine manages access.

Every ticket that exists in the system is generated, validated, and tracked by this engine.

Applications consuming the Ticket Engine include:

- Consumer Portal
- Staff PWA
- Organizer Dashboard
- PDF Generator
- Apple Wallet
- Google Wallet
- Future Mobile Applications

---

# Responsibilities

The Ticket Engine is responsible for:

- Ticket issuance
- Ticket validation
- QR generation
- QR verification
- Digital signatures
- Ticket lifecycle
- Status history
- Check-in integration
- Wallet generation
- PDF generation
- Ticket revocation
- Ticket reissue

---

# Design Principles

The Ticket Engine follows several architectural principles.

## Single Source of Truth

Every ticket exists only once.

There is no distinction between:

- Website Ticket
- PDF Ticket
- Apple Wallet Ticket
- Google Wallet Ticket

Every representation references the exact same ticket.

---

## Stateless Validation

Validation depends only on:

- QR payload
- Database state
- Digital signature

No client-side state is trusted.

---

## Deterministic Results

Given the same ticket state, validation must always return the same result.

Example:

```text
Ticket VALID

↓

Scan

↓

VALID
```

Repeated validation produces identical results until the ticket state changes.

---

## Idempotency

Validation never mutates data.

Only an accepted check-in changes ticket state.

Repeated validations without consumption produce identical responses.

---

# Ticket Lifecycle

```text
Reservation

↓

Order

↓

Payment

↓

APPROVED

↓

Ticket Issued

↓

VALID

↓

CONSUMED

↓

Finished
```

Alternative paths:

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

```text
VALID

↓

CANCELLED
```

---

# Ticket Identity

Every ticket owns a permanent identity.

Conceptually:

```text
Ticket

↓

UUID
```

This identifier never changes.

The UUID is used internally by every service.

---

# Public Identity

The public identity is represented by:

```text
ticketId

+

qrVersion

+

signature
```

This is the only information required by scanners.

---

# Ticket Ownership

A ticket belongs to exactly one:

- Order
- Event
- TicketBatch
- Holder

A ticket may optionally belong to:

- Sector
- Seat (future)

---

# Ticket Holder

Each ticket stores the holder information independently from the buyer.

Example:

Buyer:

```text
John
```

Holder:

```text
Mary
```

This allows future ticket transfer without changing the order.

---

# Ticket Status

Current lifecycle states:

```text
PENDING

VALID

CONSUMED

REVOKED

REFUNDED

CANCELLED

EXPIRED
```

Each status has explicit business meaning.

---

## PENDING

Ticket exists but is not yet available.

Typically occurs during asynchronous issuance.

---

## VALID

Ticket may enter the event.

This is the normal state after successful payment.

---

## CONSUMED

Ticket has already been used.

Further validations return:

```text
ALREADY_CONSUMED
```

---

## REVOKED

Administrative invalidation.

Examples:

- Fraud
- Chargeback
- Security

---

## REFUNDED

Ticket is no longer valid because the order has been refunded.

---

## CANCELLED

Ticket cancelled before use.

Cancellation rules depend on organizer policy.

---

## EXPIRED

Reserved for future time-limited tickets.

Currently unused.

---

# Ticket Issuance

Tickets are created only after successful payment approval.

Flow:

```text
Payment Approved

↓

Create Ticket

↓

Generate Signature

↓

Write History

↓

Audit

↓

Outbox
```

Ticket generation is asynchronous.

---

# Ticket Number

The platform intentionally avoids sequential ticket numbers.

Public identifiers should never reveal:

- Sales volume
- Order count
- Event popularity

UUIDs eliminate this issue.

---

# Ticket Version

Each ticket stores:

```text
qrVersion
```

Current version:

```text
1
```

Future versions enable:

- QR rotation
- Ticket reissue
- Security improvements

---

# QR Payload

The QR intentionally contains only the minimum required information.

Example:

```json
{
    "ticketId":"UUID",
    "version":1,
    "signature":"..."
}
```

No holder information is embedded.

No event information is embedded.

No personal data is embedded.

---

# Why Minimal Payload?

A small QR offers several advantages.

- Smaller QR codes
- Faster scanning
- Easier wallet compatibility
- No exposed personal information
- Centralized validation

All business information comes from the database.

---

# QR Generation

QR generation occurs immediately after ticket issuance.

Conceptually:

```text
Ticket

↓

Generate Payload

↓

Generate Signature

↓

Encode QR

↓

Persist
```

Generated QR is reused everywhere.

---

# Digital Signature

Every QR is signed using HMAC.

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

# Signature Verification

Validation process:

```text
Read QR

↓

Parse Payload

↓

Verify HMAC

↓

Load Ticket

↓

Validate Business Rules

↓

Return Result
```

Signature verification always occurs before database validation.

---

# Security Goals

The Ticket Engine must prevent:

- QR forgery
- Ticket cloning
- Ticket tampering
- Signature spoofing
- Replay attacks
- Duplicate consumption

---

# Ticket Validation Pipeline

Validation occurs in this order:

```text
QR Read

↓

Format Validation

↓

Signature Validation

↓

Ticket Lookup

↓

Business Rules

↓

Response
```

If any step fails, validation stops immediately.

---

# Business Validation

After signature verification, the engine validates:

- Ticket exists
- Event exists
- Ticket status
- Ticket version
- Event status
- Sector compatibility
- Check-in status

Only then may the Staff PWA accept the ticket.

---

# Ticket Engine Components

Current components include:

```text
Ticket

TicketStatusHistory

Checkin

HMAC Signer

QR Generator

QR Validator
```

Future components:

```text
PDF Generator

Wallet Generator

Seat Assignment

Transfer Engine
```

---

# Future Extensions

The Ticket Engine has been designed to support:

- Reserved seating
- Ticket transfer
- Dynamic QR rotation
- Multi-day events
- VIP access rules
- Multiple entries
- Companion tickets

without redesigning the core model.

---

# Next Section

Part 2 documents:

- TicketStatusHistory
- Checkin
- Offline validation
- Staff synchronization
- PDF generation
- Apple Wallet
- Google Wallet
- Ticket revocation
- Ticket reissue
- Complete validation flows
- Future Ticket Engine roadmap

---
---

# TicketStatusHistory

TicketStatusHistory stores every lifecycle transition performed by the Ticket Engine.

Unlike the Ticket table, which stores only the current state, TicketStatusHistory stores every state transition chronologically.

This makes the ticket lifecycle fully auditable.

---

# Purpose

The history table answers questions such as:

- When was the ticket issued?
- When was it consumed?
- Who performed the validation?
- Was it revoked?
- Was it refunded?
- What was the previous state?

The Ticket table alone cannot answer these questions.

---

# Lifecycle Recording

Every valid transition generates exactly one history record.

Example:

```text
PENDING

↓

VALID

↓

CONSUMED
```

Produces:

```text
History 1

PENDING → VALID

History 2

VALID → CONSUMED
```

---

# Recorded Fields

Typical fields include:

```text
id

ticketId

previousStatus

newStatus

reason

requestId

createdAt
```

Future fields may include:

```text
performedBy

deviceId

operatorCpf

metadata
```

---

# Business Rules

History records are:

- immutable
- append-only
- chronological
- never updated
- never deleted

History is considered legal evidence of ticket state transitions.

---

# Ordering

History must always be sorted by:

```text
createdAt ASC
```

This guarantees deterministic lifecycle reconstruction.

---

# Duplicate Protection

Duplicate transitions are not allowed.

Example:

```text
VALID

↓

VALID
```

must never create a history entry.

Likewise:

```text
CONSUMED

↓

CONSUMED
```

is rejected.

---

# Checkin

A Checkin represents a successful entrance validation.

Unlike TicketStatusHistory, Checkin records the operational event of a person entering the venue.

---

# Purpose

Checkin answers operational questions:

- Who entered?
- When?
- Through which device?
- Which operator performed the validation?
- Which sector accepted the ticket?

---

# Recorded Fields

Typical structure:

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

# Accepted Checkins

Only accepted validations create Checkin rows.

Example:

```text
VALID

↓

Accepted

↓

Checkin Created
```

---

# Rejected Validations

Rejected validations create:

```text
AuditLog
```

only.

They do **not** create:

```text
Checkin
```

This avoids polluting operational statistics.

---

# One Checkin Rule

Each ticket may generate only one accepted Checkin.

Even if scanned:

- twice
- offline
- simultaneously
- from multiple devices

the database accepts only one successful Checkin.

---

# Offline Validation

The Staff PWA was designed to operate without internet connectivity.

Offline validation relies on a locally downloaded validation bundle.

---

# Offline Bundle

Bundle contains:

- Event metadata
- Ticket IDs
- Ticket signatures
- Ticket status
- Sector information
- Bundle signature

No payment information is included.

---

# Offline Flow

```text
Download Bundle

↓

Store in IndexedDB

↓

Scan QR

↓

Local Validation

↓

Offline Queue

↓

Synchronization
```

Validation latency is independent of internet quality.

---

# Synchronization

Once connectivity returns:

```text
Offline Queue

↓

POST /staff/checkins/sync

↓

Conflict Detection

↓

Accepted

↓

History

↓

Audit
```

---

# Conflict Detection

Synchronization detects:

- Already consumed
- Event mismatch
- Invalid signature
- Ticket not found
- Sector mismatch
- Offline state conflict

---

# Offline State Conflict

Example:

Device A

```text
Online

↓

Consumes Ticket
```

Device B

```text
Offline

↓

Consumes Same Ticket
```

↓

Synchronization

↓

```text
OFFLINE_STATE_CONFLICT
```

No duplicate Checkin is created.

---

# Staff Attribution

Every accepted validation records:

```text
Operator Name

Operator CPF

Device ID
```

This provides operational traceability.

Current MVP identifies the operator without authentication.

Future versions will replace this with JWT-based Staff accounts.

---

# Ticket Validation Result

Successful validation returns a normalized ticket object.

Conceptually:

```text
QR

↓

Ticket Engine

↓

Ticket DTO

↓

Staff PWA
```

The PWA never reconstructs business rules.

---

# PDF Generation

Each issued ticket can be exported as PDF.

The PDF contains:

- Event
- Holder
- Sector
- Batch
- Instructions
- QR Code

The QR is identical to every other platform.

---

# Apple Wallet

Apple Wallet uses the same ticket identity.

Pass contents include:

- Event
- Holder
- QR
- Basic metadata

The QR is never regenerated after issuance.

---

# Google Wallet

Google Wallet follows the same principle.

Every wallet pass references the same Ticket.

No platform-specific ticket IDs exist.

---

# QR Consistency

The following must always be identical:

```text
Website QR

=

PDF QR

=

Apple Wallet QR

=

Google Wallet QR

=

Staff Validation QR
```

All representations identify the exact same Ticket.

---

# Ticket Revocation

Future administrative action.

Flow:

```text
VALID

↓

REVOKED
```

Revoked tickets immediately fail validation.

No new QR is generated.

---

# Ticket Reissue

Future functionality.

Flow:

```text
Ticket

↓

Increment qrVersion

↓

Generate New Signature

↓

Invalidate Previous Version
```

This allows replacing compromised tickets without changing their identity.

---

# Reserved Seating

The Ticket Engine has been designed to support future seat assignment.

Conceptually:

```text
Ticket

↓

Sector

↓

Seat
```

No architectural changes are required.

---

# Multiple Entries

Future ticket policies may support:

```text
Single Entry

Multiple Entries

Timed Access

VIP Reentry
```

These become validation rules rather than new ticket types.

---

# Ticket Engine Integration

Current integrations include:

```text
Checkout

↓

Ticket Issue

↓

Staff Validation

↓

Dashboard

↓

Analytics
```

Future integrations:

```text
Marketing

Finance

Admin Platform

Mobile SDK

Public APIs
```

---

# Design Principles

The Ticket Engine guarantees:

- One ticket identity
- One QR identity
- One accepted check-in
- Immutable history
- Deterministic validation
- Offline capability
- Provider independence
- Full auditability

Every application in the Flux Tickets ecosystem relies on the Ticket Engine as the authoritative source for ticket validity.

---

# Roadmap

Completed:

- Ticket issuance
- HMAC signatures
- Offline validation
- Check-in synchronization
- Conflict detection
- TicketStatusHistory
- Audit integration

Planned:

- QR rotation
- Ticket transfer
- Reserved seating
- Apple Wallet generation
- Google Wallet generation
- PDF customization
- Dynamic access rules
- Multi-day credentials

---

# Ticket Engine Complete

The Ticket Engine provides the foundation for secure ticket distribution and validation across every Flux Tickets application while maintaining a single source of truth, complete auditability, and deterministic validation behavior.

---