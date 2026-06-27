# Demo Script - RC1

Operational script for the Flux Tickets MVP Release Candidate 1 demonstration.

## Opening
1. Introduce the target objective: Verify the core end-to-end ticketing lifecycle.
2. Outline current scope limits: Operating under mock payment configurations without external webhooks.

## Walkthrough Steps
1. **Dashboard Check**: Open `/overview` and show prioritized cards.
2. **Organization Roles**: Navigate to `/organization/members` and show active managers.
3. **Event Setup**: Click "Criar Evento", configure general details and GA pricing.
4. **Publish**: Access `/events/[eventId]/publishing/checklist`, verify zero blockers, and click publish.
5. **Checkout**: Access the public page `/events/[eventId]`, reserve 1 ticket, fill mock name, and approve payment.
6. **Ticket Display**: Verify ticket details page and signature hash.
7. **Gate Scan**: Open staff portal page `/staff`, select the event, download the registry, and scan the ticket QR code.
8. **Finance Center**: Go to `/finance` and confirm Gross Revenue increased by ticket value.

## Failure Proof Cases
- Re-scanning the checked-in QR code to show duplication block.
- Scanning a QR code from a different event to show wrong-event warning.

## Closing & Reset
To restore the platform to clean state for subsequent runs, execute:
```bash
npx prisma db seed
```
