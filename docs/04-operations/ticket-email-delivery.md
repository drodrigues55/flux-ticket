# Ticket Email Delivery Operations

This guide covers operational configurations for managing, debugging, and testing ticket email delivery.

## 1. Setup & Environment
Ensure the following variables are configured on staging/production:
- `EMAIL_PROVIDER=resend` (Defaults to `mock` in local/testing)
- `RESEND_API_KEY=re_***`
- `EMAIL_FROM=tickets@flux-tickets.com`
- `EMAIL_REPLY_TO=support@flux-tickets.com`

## 2. Queue Architecture
- We use BullMQ with the queue name `tickets.email` for scheduling delivery tasks.
- Background tasks are run by `ticket-worker`.

## 3. Manual Resend Instructions
To trigger a manual ticket delivery email from support:
1. Navigate to the buyer order confirmation page: `/orders/[orderId]/confirmation`.
2. Click the "Reenviar E-mail" button.
3. This enqueues a new delivery event with the purpose `resend_ticket`.
