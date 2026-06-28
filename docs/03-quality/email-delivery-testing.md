# Email Delivery Testing

This document covers the RC1 Resend email delivery integration.

## Unit Tests

Run:

```bash
npm test -w @flux/ticket-worker
```

Covered:

- mock provider sends successfully
- Resend success maps provider message id
- Resend permanent failure maps to `FAILED`
- Resend retryable failure maps to `RETRYABLE`
- missing Resend config fails clearly
- worker delivery rules remain paid-order only

Run API write delivery rules:

```bash
npm test -w @flux/api-write -- src/tickets/ticket-delivery.test.ts
```

## Builds

Run affected builds:

```bash
npm run build -w @flux/ticket-worker
npm run build -w @flux/api-write
npm run build -w @flux/api-read
```

## Manual QA

Mock provider:

1. Set `EMAIL_PROVIDER=mock`.
2. Complete checkout with approved mock payment.
3. Confirm an `OutboxEvent` is created with type `tickets.delivery`.
4. Run the worker.
5. Confirm `AuditLog` has `EMAIL_DELIVERY_SENT` for the order.
6. Open the order confirmation page and confirm delivery state resolves from audit/outbox.

Resend provider:

1. Set `EMAIL_PROVIDER=resend`.
2. Set `RESEND_API_KEY` and `EMAIL_FROM`.
3. Complete checkout with approved mock payment.
4. Run the worker.
5. Confirm Resend receives the email and `AuditLog` stores the provider message id.

Organization invite:

1. Open dashboard organization members.
2. Create an invite.
3. Confirm `email.organizationInvite` outbox is created.
4. Run the worker.
5. Confirm `EMAIL_DELIVERY_SENT` or `EMAIL_DELIVERY_FAILED` on `OrganizationInvite`.

## Negative Cases

- Pending or failed payments must not create approved purchase confirmation email.
- Missing Resend config must fail startup/provider creation clearly.
- Retryable provider failures should retry through BullMQ and can reach dead-letter after configured attempts.
- Permanent provider failure should be visible in `AuditLog` without exposing secrets.
