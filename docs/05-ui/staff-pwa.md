# Staff PWA

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Staff Progressive Web App (PWA) is the operational application used by event staff to validate tickets during an event.

The application is designed to operate under unreliable or completely unavailable internet connections while maintaining fast ticket validation, complete auditability, and secure synchronization with the backend.

Unlike the consumer portal, the Staff PWA is **offline-first**.

---

# Objectives

The Staff PWA must:

* Validate tickets in less than 300ms.
* Continue operating without internet.
* Prevent duplicate check-ins.
* Detect forged or revoked tickets.
* Synchronize automatically when connectivity returns.
* Record every validation attempt.
* Identify which operator validated each ticket.
* Identify which device performed the validation.
* Keep the validation flow continuous with minimal operator interaction.

---

# Architecture

```text
Operator

↓

Local Profile

↓

Select Event

↓

Download Offline Bundle

↓

IndexedDB

↓

Scanner

↓

Ticket Engine

↓

Validation Result

↓

Check-in Queue

↓

Automatic Sync

↓

Backend
```

---

# Core Principles

* Offline-first architecture.
* Backend remains the source of truth.
* Local validation follows the exact same business rules as online validation.
* Every accepted check-in is auditable.
* Every synchronization is idempotent.
* Ticket validation logic is centralized inside the Ticket Engine.

---

# First Launch

On first launch, the operator creates a local profile.

This profile does **not** require backend authentication and exists solely for audit purposes.

Required information:

* Full Name
* CPF

Example:

```text
Name

______________________

CPF

___.___.___-__

[Continue]
```

The application generates a local operator identifier.

```text
operatorId
```

This identifier is stored in IndexedDB and accompanies every future check-in.

---

# Local Operator

Example structure:

```json
{
  "operatorId": "opr_01JXXXX",
  "name": "João Silva",
  "cpf": "12345678900",
  "createdAt": "2026-06-19T18:00:00Z"
}
```

The operator profile remains local until synchronized with backend check-ins.

Future authenticated Staff accounts can replace this local registration without changing the rest of the architecture.

---

# Device Identification

Each installation generates a persistent Device ID.

Example:

```text
deviceId

↓

dev_01JXXXXX
```

The Device ID is included in:

* Check-ins
* Synchronization
* Audit Logs
* Staff Sessions

---

# Staff Session

Each event creates a Staff Session.

Purpose:

* Associate operator
* Associate device
* Associate event
* Associate sector

Example:

```text
StaffSession

id

operatorId

deviceId

eventId

sectorId

startedAt

endedAt
```

---

# Event Selection

After opening the application:

```text
Select Event

↓

Tomorrowland

Festival MS

Show X
```

Only events assigned to the device or operator are displayed.

---

# Sector Selection

Some operators validate only specific sectors.

Example:

```text
General Admission

VIP

Backstage

Premium
```

The selected sector becomes part of the current Staff Session.

---

# Offline Bundle

The operator downloads the Offline Bundle before the event.

Bundle contains:

* Event metadata
* Ticket catalog
* Ticket signatures
* Allowed statuses
* Sector information
* Validation rules
* Bundle signature
* Generation timestamp

Stored in IndexedDB.

---

# Bundle Structure

Example:

```text
Bundle

↓

Event

↓

Tickets

↓

Sectors

↓

Validation Metadata

↓

Signature
```

---

# IndexedDB

Main collections:

* Bundle
* Tickets
* Operator
* Device
* Pending Check-ins
* Synchronization Queue
* Configuration

---

# Scanner

Scanner operates continuously.

Capabilities:

* Rear camera
* Camera selection
* Flash
* Continuous scanning
* Debounce
* Fullscreen mode

Supported libraries:

* html5-qrcode
* Barcode Detection API (future)

---

# QR Code

The scanner reads only the QR payload.

The QR **never contains business information**.

Example payload:

```text
flux://ticket

tid=tck_01J...

sig=...

ver=2
```

The scanner forwards this payload to the Ticket Engine.

---

# Ticket Engine

Validation pipeline:

```text
QR

↓

Parse

↓

Signature Validation

↓

Lookup

↓

Business Rules

↓

Validation Result
```

The Ticket Engine behaves identically online and offline.

---

# Validation Results

Possible outcomes:

## Accepted

```text
✔ ENTRY ALLOWED

John Smith

VIP

Lot 2

19:35
```

---

## Already Used

```text
❌ ALREADY CHECKED IN

19:12

Operator:

Maria Oliveira
```

---

## Invalid Signature

```text
❌ INVALID QR

Signature verification failed.
```

---

## Revoked

```text
❌ TICKET REVOKED
```

---

## Wrong Event

```text
⚠ DIFFERENT EVENT
```

---

## Wrong Sector

```text
⚠ INVALID SECTOR
```

---

## Expired

```text
⚠ EXPIRED TICKET
```

---

## Offline Conflict

```text
⚠ OFFLINE CONFLICT

Synchronization required.
```

---

# Accepted Check-in

Accepted validations create a local Check-in.

Example:

```json
{
  "ticketId": "...",
  "operatorId": "...",
  "deviceId": "...",
  "staffSessionId": "...",
  "timestamp": "...",
  "offline": true
}
```

---

# Rejected Validation

Rejected validations do **not** create Checkin records.

They create only audit entries after synchronization.

---

# Continuous Flow

After validation:

```text
Result

↓

Display

↓

1 second

↓

Return to Scanner
```

Operator interaction should be minimal.

---

# Offline Queue

Accepted validations are appended to the synchronization queue.

```text
Pending Queue

↓

IndexedDB
```

---

# Synchronization

When internet returns:

```text
Pending Queue

↓

POST /staff/checkins/sync

↓

Backend

↓

Audit

↓

History

↓

Confirmation
```

Synchronization is automatic.

---

# Conflict Resolution

Possible conflicts:

* Already consumed
* Invalid signature
* Revoked ticket
* Event mismatch
* Sector mismatch
* Duplicate synchronization

Conflicts never overwrite backend state.

---

# Duplicate Detection

Synchronization is idempotent.

Each check-in contains:

* checkinId
* ticketId
* operatorId
* deviceId
* timestamp

Duplicates are ignored safely.

---

# Operator Replacement

Menu option:

```text
Change Operator
```

This clears only:

* Local operator profile
* Active Staff Session

Downloaded event bundles remain available unless explicitly removed.

---

# Bundle Refresh

Operators can manually refresh the offline bundle.

Refresh updates:

* Ticket statuses
* Revocations
* New tickets
* Validation metadata

---

# Dashboard

Operational information:

* Event
* Operator
* Device
* Sector
* Last synchronization
* Pending check-ins
* Battery status
* Connectivity

---

# Connectivity Indicator

States:

```text
ONLINE
```

```text
OFFLINE
```

```text
SYNCING
```

```text
ERROR
```

---

# Security

The Staff PWA never stores:

* Payment information
* JWT secrets
* HMAC secrets
* Credit card information

Sensitive ticket information remains signed.

---

# Audit

Every accepted synchronization records:

* Operator
* Device
* Staff Session
* Timestamp
* Ticket
* Event
* Sector

Audit entries remain immutable.

---

# Future Improvements

Planned after MVP:

* Authenticated Staff accounts
* RBAC permissions
* Remote device management
* Device approval workflow
* Push notifications
* Live operator dashboard
* Multi-device coordination
* Biometric operator authentication
* Remote bundle invalidation

---

# API Contracts

Primary endpoints:

```text
GET /staff/events/:eventId/offline-bundle

POST /staff/checkins/sync
```

Compatibility endpoints:

```text
GET /events/:id/staff-sync

POST /events/:id/staff-mutation
```

---

# Performance Targets

| Metric              | Target             |
| ------------------- | ------------------ |
| Bundle download     | < 10 s             |
| QR scan             | < 300 ms           |
| Local validation    | < 100 ms           |
| Check-in creation   | < 50 ms            |
| Synchronization     | Automatic          |
| Duplicate detection | 100% deterministic |

---

# Roadmap

## Phase 6C

* Local operator onboarding
* Device registration
* Scanner UX
* Validation screens
* Staff Session
* Offline queue improvements
* Operational dashboard

## Future

* Authenticated staff accounts
* Multi-event devices
* Remote session control
* Live operator analytics
* Device fleet management

---

# Design Principles

* Offline-first
* Fast validation
* Continuous scanning
* Deterministic validation
* Backend as source of truth
* Complete auditability
* Replaceable authentication layer
* Shared Ticket Engine across Website, PDF, Wallets, and Staff PWA
