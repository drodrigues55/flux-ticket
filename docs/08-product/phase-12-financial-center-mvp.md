# Phase 12 Financial Center MVP

Phase 12 gives organizers a read-only financial center before a real gateway or payout rail exists.

## Included

- Financial overview with gross revenue, approved revenue, pending revenue, failed or expired amount, estimated fees, and estimated net revenue.
- Event-level financial detail with ticket type revenue, batch revenue, payment status breakdown, and recent payments.
- Payment ledger with safe payment metadata, status, provider, amount, ticket-issued flag, and delivery status.
- Basic CSV exports for the payment ledger and event financial summary.

## Labels And Limitations

All fee and net values are labeled as estimated. The dashboard must state that the mock provider is active, real gateway is not connected, and payouts are not available yet.

This phase does not implement real payouts, invoices, taxes, refunds, chargebacks, bank onboarding, or external accounting integrations.

## Fee Estimate

The fee model is centralized in `api-read` and uses:

- `PLATFORM_FEE_PERCENT`, default `5`
- `PLATFORM_FIXED_FEE`, default `0`

Estimated fee = `grossAmount * percentage / 100 + fixedFee`.
Estimated net = `grossAmount - estimated fee`.
