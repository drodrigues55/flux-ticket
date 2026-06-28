# Consumer Portal

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Consumer Portal is the public-facing application of Flux Tickets.

It allows customers to discover events, purchase tickets, manage orders, recover pending payments, access issued tickets, download PDFs, and add tickets to Apple Wallet or Google Wallet.

The portal is designed around a **Reservation → Order → Payment → Ticket** lifecycle.

Business rules always reside in the backend. The frontend only orchestrates the user experience and renders backend data.

---

# Objectives

The Consumer Portal must:

* Discover events quickly.
* Prevent ticket overselling.
* Provide a simple checkout.
* Recover interrupted purchases.
* Expose ticket status clearly.
* Provide access to QR Codes.
* Support Wallet integrations.
* Remain responsive under high traffic.

---

# Architecture

```text
Catalog

↓

Event

↓

Batch

↓

Reservation

↓

Checkout

↓

Payment

↓

Order

↓

Ticket

↓

Ticket Page

↓

QR

↓

Wallet / PDF
```

---

# Core Principles

* Backend is the source of truth.
* Reservation-first checkout.
* Frontend performs no inventory calculations.
* Payment providers are replaceable.
* One ticket, one QR.
* Wallets, PDF and Website always display the same QR.

---

# Event Catalog

The homepage displays all published events.

Supports:

* Categories
* Search
* Featured events
* Upcoming events
* Sold-out indication

Information displayed:

* Banner
* Event name
* Venue
* Date
* Starting price
* Availability

---

# Event Details

Displays:

* Description
* Venue
* Date
* Schedule
* Categories
* Available sectors
* Ticket batches
* Prices

The page consumes only `api-read`.

---

# Ticket Batches

Each batch exposes:

* Name
* Price
* Remaining quantity
* Sales period
* Status

Possible statuses:

* Available
* Coming Soon
* Sold Out
* Hidden

---

# Reservation

When the customer selects tickets:

```text
Tickets

↓

Reservation

↓

Redis Lock

↓

Reservation Timer
```

The backend creates a Reservation.

The frontend never reserves inventory locally.

---

# Reservation Timer

Each reservation includes:

* expiresAt
* remainingTime

Countdown is displayed in real time.

When expired:

* Reservation is released.
* Cart becomes invalid.
* Inventory returns automatically.

---

# Checkout

Checkout collects:

* Buyer information
* CPF
* Ticket holders
* Payment method

Supported payment methods:

* PIX
* Credit Card

Future:

* Debit
* Apple Pay
* Google Pay

---

# Buyer Information

Example:

```text
Full Name

Email

CPF

Phone
```

---

# Ticket Holders

Each ticket may have:

* Name
* CPF
* Birth Date

Validation occurs server-side.

---

# Payment

Current architecture uses PaymentProvider.

Example:

```text
Checkout

↓

PaymentProvider

↓

Order

↓

Payment

↓

Webhook

↓

Ticket Issue
```

The frontend does not know which provider is being used.

---

# Payment States

Supported statuses:

* Pending
* Approved
* Rejected
* Expired
* Failed
* Refunded (future)

---

# Pending Payments

Pending payments remain visible.

Customer may:

* Resume payment
* Generate new PIX
* Retry card payment (future)

---

# Automatic Recovery

Background workers periodically verify pending payments.

If payment is approved:

```text
Payment

↓

Approved

↓

Issue Ticket

↓

Notify Customer
```

No customer action required.

---

# Abandoned Cart

When reservation expires:

```text
Reservation

↓

Expired

↓

Cart Abandoned
```

Future features:

* Email reminder
* WhatsApp reminder
* Notification
* Resume checkout

---

# Waitlist

Sold-out batches expose:

```text
Join Waitlist
```

Customer provides:

* Name
* Email

Backend creates:

```text
WaitlistEntry
```

When inventory returns:

```text
Worker

↓

Invitation

↓

Notification
```

---

# My Tickets

Authenticated or identified customer can access:

* Purchased tickets
* Ticket status
* Orders
* Payments

---

# Profile And Payment Settings

Profile and payment settings use an email OTP wall only when the customer changes sensitive data.

Layout rules:

* Do not show a standalone OTP card above the form.
* Place OTP verification in the final action row of the form.
* Keep the primary action above the verification note.
* Keep the verification title, helper text, and OTP field below the action, occupying the full block width.
* Use the same stacked structure on desktop and mobile, adjusting spacing only to preserve legibility.
* The primary action advances through the secure flow: `Enviar codigo` -> `Confirmar codigo` -> final save/add/update action.
* The OTP block appears only after the form has real changes or filled payment data.

---

# Ticket Page

Each ticket displays:

* Event
* Holder
* Sector
* Batch
* Order
* Status
* QR Code

The QR displayed here is the canonical ticket QR.

---

# QR Code

Every issued ticket has exactly one QR.

The same QR is reused for:

* Website
* PDF
* Apple Wallet
* Google Wallet

QR payload contains only:

```text
Ticket Identifier

Signature

Version
```

No business data is embedded.

---

# Ticket States

Possible states:

* Pending
* Valid
* Used
* Revoked
* Cancelled
* Refunded
* Expired

The frontend only renders backend status.

---

# PDF Download

Customer may download a printable ticket.

PDF contains:

* Event
* Holder
* QR Code
* Ticket information

Generated server-side.

---

# Apple Wallet

Issued ticket may be exported as:

```text
.pkpass
```

Wallet pass contains:

* Event
* Holder
* Seat/Sector
* QR Code

QR remains identical to Website.

---

# Google Wallet

Issued ticket may be exported to Google Wallet.

Uses the same ticket information and QR.

---

# Notifications

Future notification channels:

* Email
* SMS
* WhatsApp
* Push Notifications

Events:

* Payment approved
* Ticket issued
* Reminder
* Waitlist invitation
* Event updates

---

# Payment Recovery

Customer may return later.

Portal loads current payment state.

Possible actions:

* Continue payment
* Download ticket
* View receipt

---

# Error States

Examples:

Reservation expired

```text
Reservation expired.

Please start a new checkout.
```

Payment failed

```text
Payment failed.

Please try another payment method.
```

Ticket revoked

```text
This ticket is no longer valid.
```

---

# Loading Strategy

Frontend loads independently:

* Catalog
* Event
* Checkout
* Ticket
* Orders

Each section can fail independently.

---

# API Contracts

Main endpoints:

```text
GET /events

GET /events/:id

POST /tickets/reserve

POST /payments/checkout

GET /orders/:id

GET /tickets/:id

GET /tickets/:id/pdf

GET /tickets/:id/wallet/apple

GET /tickets/:id/wallet/google

POST /events/:id/batches/:batchId/waitlist
```

---

# Response Format

All new endpoints use:

Success

```json
{
  "data": {},
  "meta": {
    "requestId": "req_xxx"
  }
}
```

Errors

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

# Performance Goals

| Metric       | Target   |
| ------------ | -------- |
| Catalog      | < 500 ms |
| Reservation  | < 300 ms |
| Checkout     | < 500 ms |
| Ticket Page  | < 300 ms |
| QR Render    | < 100 ms |
| PDF Download | < 2 s    |

---

# Security

The Consumer Portal never stores:

* Card numbers
* CVV
* Gateway secrets
* HMAC secrets

Sensitive payment processing is delegated to the backend.

---

# Future Features

* Mercado Pago Provider
* Multiple payment providers
* Coupon engine
* Gift tickets
* Seat selection
* Split payments
* Installments
* Dynamic pricing
* Membership integration

---

# Design Principles

* Backend-driven UI.
* Stateless frontend.
* Reservation-first checkout.
* Shared Ticket Engine.
* Shared QR across all platforms.
* Provider-agnostic payment architecture.
* Progressive enhancement.
* High availability under peak traffic.

---

# Roadmap

## Phase 6A

* Mock Payment Provider
* Waitlist
* Pending Recovery
* Abandoned Cart
* Provider abstraction

## Phase 6B

* Ticket Engine
* QR Generator
* PDF
* Apple Wallet
* Google Wallet

## Phase 6C

* Staff validation integration
* Ticket lifecycle completion
* End-to-end ticket experience
