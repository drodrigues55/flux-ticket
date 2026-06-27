# RC1 Release Checklist

Release checklist for the MVP Release Candidate 1 of Flux Tickets.

## RC1 Scope
- **Organizer Portal**: Create event, configure tickets & batches, validation checklist, publish.
- **Consumer Portal**: Public event details, ticket selection, reservation cart, mock payment checkout.
- **Staff Portal**: Gate operations, QR scan ticket, offline synchronization.
- **Financial Center**: Gross/net calculations, payment ledger, CSV exports.
- **Dashboard Command Center**: Priority-ranking heuristic ranking engine, hero event.
- **Organization Management**: Profile, team roles, invites.

## Out-of-Scope Items
- Real payment gateway.
- Real refunds and chargebacks.
- Native mobile apps.
- Seating, coupons, white label.

## Release-Blocker Definition
- Production build failure.
- Automated tests failure.
- Broken checkout or ticket issuing.
- Cross-tenant or cross-organization data leakage.

## Manual QA Checklist
Refer to [manual-qa-results-rc1.md](../03-quality/manual-qa-results-rc1.md) for scenarios.

## Smoke Test Checklist
Refer to [rc1-smoke-test-results.md](../03-quality/rc1-smoke-test-results.md) for scenarios.

## Deployment Checklist
Refer to [deployment-prep.md](./deployment-prep.md) for step-by-step guidance.

## Rollback Checklist
- Restore database backup using [database-backup-restore.md](./database-backup-restore.md).
- Revert services to previous working tag.

## Final Approval Checklist
- [ ] All automated tests pass.
- [ ] All package builds pass.
- [ ] No active Release Blockers exist.
