# Resend Email Setup

Resend is the first real external transactional email provider for Flux Tickets.

## Environment Variables

Required when `EMAIL_PROVIDER=resend`:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
EMAIL_FROM="Flux Tickets <tickets@your-domain.com>"
```

Optional:

```bash
EMAIL_REPLY_TO=support@your-domain.com
PUBLIC_CLIENT_URL=https://tickets.example.com
DASHBOARD_PUBLIC_URL=https://dashboard.example.com
```

Development and test can use:

```bash
EMAIL_PROVIDER=mock
```

If `EMAIL_PROVIDER` is omitted, non-production defaults to mock. Production defaults to Resend and fails clearly when `RESEND_API_KEY` or `EMAIL_FROM` is missing.

## Operational Flow

1. Payment approval marks the order as `PAID`.
2. `api-write` creates an `OutboxEvent` with type `tickets.delivery`.
3. `ticket-worker` publishes/consumes the `tickets.email` queue.
4. The worker sends through `MockEmailProvider` or `ResendEmailProvider`.
5. `AuditLog` records `EMAIL_DELIVERY_SENT` or `EMAIL_DELIVERY_FAILED`.

Organization invites use the same provider through `email.organizationInvite` outbox events.

## Failure Behavior

- Resend 5xx and 429 responses are `RETRYABLE` and cause worker retry.
- Resend 4xx responses are `FAILED` and are recorded without retrying forever.
- Secrets and full provider responses are not logged.
- Email failure does not duplicate tickets or reverse payment state.

## Limitations

- Real payment gateway and settlement are not connected by this integration.
- PDF ticket attachments are not sent yet.
- There is no dedicated `EmailDelivery` table yet; use `AuditLog`, outbox, and dead-letter queues for QA/operator visibility.
