# MVP Release Checklist

Operational readiness check for the Flux Tickets platform.

## Pre-Release Verification
- [ ] Database migrations run and schema matches Prisma layout.
- [ ] Redis connection established and BullMQ workers registered.
- [ ] Environment variables configured correctly.
- [ ] SSL certificates applied to API and client subdomains.

## Verification Steps
### Organizer Flow
1. Create an event, batches, and ticket types.
2. Edit details and confirm publishing validation pass.
3. Publish the event.

### Consumer Flow
1. Access the published event public details page.
2. Choose a ticket and reserve successfully.
3. Execute checkout mock payment.
4. Access confirmation ticket page and download PDF.
