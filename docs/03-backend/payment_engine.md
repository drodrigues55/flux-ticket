# Payment Engine

> Version: 2.0  
> Last Updated: June 2026

---

# Overview

The Payment Engine is responsible for orchestrating the complete payment lifecycle inside Flux Tickets.

Unlike payment gateways, the Payment Engine is provider-independent.

Its responsibility is to translate external payment providers into a single internal business model.

Current implementation uses a Mock Payment Provider.

Future providers (Mercado Pago, Stripe, Asaas, PagSeguro, etc.) will implement the same interface without requiring changes to the business layer.

---

# Responsibilities

The Payment Engine is responsible for:

- Payment creation
- Provider abstraction
- Checkout orchestration
- Webhook processing
- Payment recovery
- Payment expiration
- Pending reconciliation
- Waitlist triggering
- Idempotency
- Outbox publication

It is **not** responsible for issuing tickets.

Ticket issuance belongs to the Ticket Engine.

---

# Architecture

```text
Checkout

↓

Payment Engine

↓

PaymentProvider Interface

↓

Provider

↓

Webhook

↓

Payment Engine

↓

Business State
```

The application never communicates directly with Mercado Pago or any other gateway.

Everything passes through the Payment Engine.

---

# Design Principles

The Payment Engine follows these principles:

- Provider agnostic
- Idempotent
- Event driven
- Retry safe
- Stateless
- Transactional
- Observable

---

# Payment Flow

```text
Reservation

↓

Order

↓

Payment

↓

Provider

↓

Webhook

↓

Approval

↓

Ticket Engine
```

---

# PaymentProvider Interface

Every gateway implements the same interface.

Conceptually:

```text
PaymentProvider

↓

createPayment()

↓

getPayment()

↓

parseWebhook()

↓

validateWebhook()

↓

cancelPayment()
```

The business layer depends only on this contract.

---

# Current Provider

Current implementation:

```text
MockPaymentProvider
```

Supported scenarios:

- PIX Pending
- Card Approved
- Card Rejected
- Payment Expired
- Temporary Provider Error
- Pending Recovery
- Mock Webhooks

This allows the platform to evolve before obtaining production gateway credentials.

---

# Future Providers

Planned implementations:

```text
MercadoPagoProvider

StripeProvider

AsaasProvider

PagSeguroProvider
```

No database redesign should be required.

---

# Payment Entity

Each payment stores:

```text
provider

providerPaymentId

providerStatus

providerEventId

idempotencyKey

status

rawPayload
```

Provider-specific fields remain isolated.

---

# Internal Status

The Payment Engine exposes normalized statuses.

```text
PENDING

APPROVED

FAILED

REJECTED

EXPIRED

REFUNDED
```

Business rules never depend on provider terminology.

---

# Provider Mapping

Example:

Mercado Pago

```text
approved
```

↓

Internal

```text
APPROVED
```

Stripe

```text
succeeded
```

↓

Internal

```text
APPROVED
```

This guarantees provider independence.

---

# Checkout Creation

Checkout flow:

```text
Reservation

↓

Order

↓

Payment

↓

Provider.createPayment()

↓

Checkout Response
```

The provider returns only payment instructions.

Business ownership remains inside Flux.

---

# Payment Instructions

Depending on the provider, checkout may return:

- PIX
- QR Code
- Copy & Paste Code
- Credit Card Authorization
- Redirect URL

The frontend simply renders the returned information.

---

# Payment Confirmation

Confirmation never comes from the frontend.

Only two mechanisms may confirm payment:

- Webhook
- Recovery Worker

This prevents client-side fraud.

---

# Webhook Processing

Flow:

```text
Provider

↓

Webhook

↓

Validate Signature

↓

Parse Event

↓

Payment Engine

↓

Business Transaction
```

The Payment Engine owns webhook processing.

---

# Idempotency

Every provider event is processed exactly once.

Primary identifiers include:

```text
providerEventId

providerPaymentId

idempotencyKey
```

Repeated events become no-ops.

---

# Duplicate Protection

Example:

```text
Webhook

↓

Approved

↓

Webhook Again

↓

Ignored
```

Business effects occur only once.

---

# Payment Approval

Approval transaction:

```text
Acquire Lock

↓

Reload Payment

↓

Already Approved?

↓

No

↓

Approve

↓

Outbox

↓

Commit
```

This guarantees concurrency safety.

---

# Concurrency

The Payment Engine is designed for:

- Duplicate webhooks
- Parallel recovery
- Concurrent provider callbacks
- Network retries

Expected behavior:

```text
50 Approval Requests

↓

1 Payment Approved

↓

1 Ticket Issued
```

---

# Provider Errors

Provider failures are classified as:

- Temporary
- Permanent

Temporary failures are retried.

Permanent failures update business state.

---

# Retry Strategy

Temporary failures generate retries through BullMQ.

Flow:

```text
Failure

↓

Retry

↓

Retry

↓

Retry

↓

Dead Letter
```

Retry policies are configurable per queue.

---

# Expiration

Payments may expire.

Flow:

```text
Pending

↓

Expired

↓

Reservation Released

↓

Waitlist
```

Expiration never issues tickets.

---

# Next Section

Part 2 documents:

- Payment Recovery
- Worker Integration
- Queue System
- Waitlist
- Abandoned Cart
- Notifications
- Production Gateway Integration
- Mercado Pago Implementation
- Security
- Future Roadmap

---
---

# Payment Recovery

Not every payment reaches a final state immediately.

Some providers may keep payments in a pending state for minutes or even hours.

The Payment Engine periodically reconciles pending payments to guarantee eventual consistency.

---

# Recovery Philosophy

Recovery exists to guarantee that temporary provider failures do not leave the platform in an inconsistent state.

The Payment Engine assumes that:

- webhooks may fail
- webhooks may arrive late
- providers may become temporarily unavailable

Recovery ensures the business state eventually converges to the provider state.

---

# Recovery Flow

```text
Pending Payment

↓

BullMQ

↓

payments.recoverPending

↓

PaymentProvider.getPayment()

↓

Compare Status

↓

Business Transaction

↓

Done
```

Recovery never bypasses business rules.

---

# Recovery Queue

Current queue:

```text
payments.recoverPending
```

Responsibilities:

- recover pending payments
- synchronize provider status
- retry temporary failures
- publish Outbox events
- avoid duplicate approvals

---

# Recovery Trigger

Payments become eligible for recovery when:

- status remains PENDING
- provider timeout occurs
- webhook has not arrived
- retry interval is reached

Recovery intervals are configurable.

---

# Recovery States

Possible outcomes:

```text
PENDING

↓

APPROVED
```

```text
PENDING

↓

FAILED
```

```text
PENDING

↓

EXPIRED
```

```text
PENDING

↓

Still Pending
```

The worker exits without side effects if no status changes.

---

# Webhook vs Recovery

Webhook remains the preferred source of truth.

Recovery exists only as a fallback.

Priority:

```text
Webhook

↓

Recovery
```

If a webhook already approved the payment, recovery becomes a no-op.

---

# Idempotent Recovery

Recovery must never approve a payment twice.

Example:

```text
Webhook

↓

APPROVED

↓

Recovery

↓

No-op
```

Likewise:

```text
Recovery

↓

APPROVED

↓

Webhook Arrives Later

↓

No-op
```

---

# Queue Integration

Recovery publishes business events through Outbox.

Flow:

```text
Payment Approved

↓

OutboxEvent

↓

tickets.issue

↓

notifications.placeholder
```

The worker never communicates directly with downstream services.

---

# Abandoned Cart

Customers frequently leave checkout before completing payment.

Flux tracks abandoned reservations independently from payment expiration.

---

# Abandoned Flow

```text
Reservation

↓

Checkout Started

↓

Customer Leaves

↓

Reservation Timeout

↓

ABANDONED
```

Inventory becomes available again.

---

# Queue

Current queue:

```text
carts.expireAbandoned
```

Responsibilities:

- expire reservations
- restore inventory
- trigger waitlist
- publish Outbox events

---

# Waitlist

Waitlists allow customers to register interest in sold-out batches.

Joining a waitlist never reserves inventory.

---

# Waitlist Flow

```text
Batch Sold Out

↓

Join Waitlist

↓

Inventory Returns

↓

Invite Customer

↓

Purchase

↓

Done
```

---

# Queue

Current queue:

```text
waitlist.invite
```

Responsibilities:

- monitor inventory
- invite customers
- expire invitations
- prevent duplicate invitations

---

# Notification Placeholder

Current implementation exposes:

```text
notifications.placeholder
```

This queue intentionally contains no production provider.

Future implementations may include:

- Email
- SMS
- WhatsApp
- Push Notifications

without changing business logic.

---

# Provider Isolation

Business services must never import a concrete provider.

Correct dependency:

```text
PaymentsService

↓

PaymentProvider Interface

↓

Provider
```

Incorrect dependency:

```text
PaymentsService

↓

MockPaymentProvider
```

Provider resolution belongs to dependency injection.

---

# Provider Selection

Future environments may choose providers through configuration.

Example:

```text
PAYMENT_PROVIDER=mock

PAYMENT_PROVIDER=mercadopago

PAYMENT_PROVIDER=stripe
```

The application should start without recompilation.

---

# Security

Sensitive provider data must never be exposed.

Never return:

- access tokens
- webhook secrets
- provider credentials
- raw authentication headers

Only normalized business data should leave the backend.

---

# Webhook Validation

Every provider implements its own signature validation.

Conceptual flow:

```text
Receive Webhook

↓

Validate Signature

↓

Parse Payload

↓

Normalize Event

↓

Business Transaction
```

Invalid signatures terminate processing immediately.

---

# Observability

Every payment operation generates:

- requestId
- AuditLog
- structured logs
- Outbox events

Workers additionally record:

- queueName
- jobId
- retry count
- processing duration

---

# Error Classification

Errors fall into three categories.

## Business Errors

Examples:

```text
PAYMENT_ALREADY_APPROVED

PAYMENT_EXPIRED

INVALID_PAYMENT_STATE
```

No retries occur.

---

## Provider Errors

Examples:

```text
Gateway Timeout

Temporary Network Failure

Rate Limit
```

Eligible for retry.

---

## Infrastructure Errors

Examples:

```text
Redis Offline

Database Failure

Queue Failure
```

Infrastructure handles retries and dead-letter routing.

---

# Future Mercado Pago Implementation

The future MercadoPagoProvider will implement:

```text
createPayment()

getPayment()

cancelPayment()

parseWebhook()

validateWebhook()
```

The Payment Engine itself will remain unchanged.

Only the provider implementation will differ.

---

# Future Features

Planned capabilities include:

- Installments
- Split payments
- Chargebacks
- Partial refunds
- Full refunds
- Scheduled settlements
- Financial reconciliation
- Multi-provider failover
- Automatic provider switching

These features extend the Payment Engine without modifying its core architecture.

---

# Design Principles

The Payment Engine guarantees:

- provider independence
- exactly-once approval
- deterministic recovery
- retry-safe processing
- complete observability
- auditability
- transactional consistency

Business logic never depends on a specific payment gateway.

---

# Roadmap

Completed:

- Payment abstraction
- Mock provider
- Pending recovery
- Waitlist integration
- Abandoned cart expiration
- Provider-ready schema
- Webhook normalization

Planned:

- Mercado Pago integration
- PIX production flow
- Credit card production flow
- Installments
- Refund engine
- Chargeback handling
- Financial reconciliation
- Settlement engine
- Notification providers

---

# Payment Engine Complete

The Payment Engine isolates the Flux Tickets business domain from external payment gateways while providing a consistent, observable, idempotent, and recoverable payment workflow.

---
