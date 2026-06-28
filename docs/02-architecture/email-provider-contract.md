# Email Provider Contract

Flux Tickets sends transactional email through a provider abstraction in `services/ticket-worker/src/email-provider.ts`.

## Providers

- `MockEmailProvider`: default for development and tests.
- `ResendEmailProvider`: real transactional email adapter, selected with `EMAIL_PROVIDER=resend`.

No product flow should call Resend directly. Payment, order, ticket, and organization flows create outbox events; the worker consumes those events and calls the configured provider.

## Contract

The `EmailProvider` supports:

- generic transactional email
- ticket email
- purchase confirmation
- organization invite
- resend-ticket email

Every send returns:

- `status`: `SENT`, `FAILED`, or `RETRYABLE`
- `provider`: `mock` or `resend`
- optional `messageId`
- optional safe error code/message

Provider failures never expose secrets or full provider responses to users.

## Delivery State

There is no dedicated `EmailDelivery` table in RC1. Delivery state is visible through:

- `OutboxEvent` for pending queue work
- `AuditLog` with `EMAIL_DELIVERY_SENT`
- `AuditLog` with `EMAIL_DELIVERY_FAILED`
- BullMQ retries/dead-letter queues for retryable worker failures

This keeps delivery state visible for QA/operators without adding a broad migration in this phase.

## Idempotency

Ticket and purchase confirmation emails are idempotent per order and purpose. The worker checks `AuditLog` for an existing `EMAIL_DELIVERY_SENT` record before sending again.

Manual resend uses purpose `resend_ticket`, so it can be tracked separately from the initial purchase confirmation.

## Current Templates

- purchase confirmation and ticket links after `ORDER_PAID`
- manual resend-ticket email
- organization invite email

PDF attachment delivery remains out of scope. Email links point users to the existing ticket access pages.
