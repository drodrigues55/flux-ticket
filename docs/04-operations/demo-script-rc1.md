# Demo Script - RC1

Operational script for the Flux Tickets MVP Release Candidate 1 demonstration.

## Opening

1. State the demo objective: show the stable MVP loop from public ticket purchase to staff validation and operational visibility.
2. Set scope clearly: payment is running in mock mode, real gateway settlement and payouts are not connected, and finance values are for MVP/demo validation only.
3. Use the RC1 seed when dashboard organizer screens need to be shown. Do not depend on creating a new dashboard event live unless it has already been validated in the target environment.

## Official Demo Path

1. **Public catalog**: Open the public event catalog and choose an existing demo event.
2. **Event detail**: Open the public event page and review the event, ticket area, and purchase CTA.
3. **Reservation**: Select one ticket and reserve it.
4. **Checkout**: Fill buyer details and complete checkout with mock card payment.
5. **Ticket access**: Open the success/ticket page and confirm the ticket is available.
6. **Staff PWA**: Open the staff app, enter operator details, and select the same event.
7. **Registry/sync**: Complete the sync gate if shown.
8. **Validation**: Validate the ticket QR or simulator state.
9. **Failure proof**: If practical, show already-used or wrong/adulterated QR behavior.
10. **Finance overview**: Open `/finance` and explain the visible mock limitation note.
11. **Command center**: Open the dashboard command center as an operational overview, not as perfect live financial truth.
12. **Known limitations**: Close with the explicit RC1 limitations and post-RC1 scope.

## Dashboard Fallback

Use the prepared RC1 seed event whenever possible. The seed aligns public events with the `organizer-mock` dashboard account, so dashboard event management should show the same event dataset after reset.

If dashboard event creation returns a validation error, capture the request ID, skip live creation, and continue with the prepared public event. This demo focuses on the verified public purchase, ticket access, staff validation, finance visibility, and command-center loop.

## Finance Narration

Use this wording when opening the financial center:

"Mock payment mode: financial values are for MVP/demo validation only. Real gateway settlement is not connected."

Do not claim finance values are real payout data. The finance center is RC1 visibility over available payment/read-model records, not a settlement engine.

## Closing & Reset

For repeated local demos, reset prepared data only when needed:

```bash
npx prisma db seed
```
