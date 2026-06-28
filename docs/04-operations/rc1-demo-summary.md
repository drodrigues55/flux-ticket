# RC1 Demo Summary

Summary details for the Release Candidate 1 demonstration.

## Status Summary

- **Demo Readiness Status**: **Demo Ready with Known Risks**
- **Staging Environment**: Verified under local staging environments.
- **Manual QA Status**: PASS for the stable public purchase, ticket access, staff validation, finance overview, and command-center path.
- **Blockers remaining**: 0 issues block the official demo path.
- **Demo Positioning**: Use prepared/public demo data and avoid live dashboard event creation unless a fixture is loaded.
- **Staff PWA Status**: Revalidated on `http://localhost:3000`; event list, sync gate, visible validation success, visible tampered QR rejection, and staff mutation proxy passed.

## Official Demo Path

1. Open public event catalog.
2. Select event.
3. Reserve ticket.
4. Checkout with mock payment.
5. Confirm ticket access.
6. Open Staff PWA.
7. Select event.
8. Validate ticket.
9. Show already-used or wrong-event behavior if practical.
10. Show finance overview with mock limitation note.
11. Show dashboard command center as operational overview.
12. Close with known limitations.

## Known Risks

| Classification | Risk | Demo Handling |
| --- | --- | --- |
| Demo Risk | Dashboard event creation may require prepared/demo data. | Use an existing public demo event; skip live creation if validation fails. |
| Demo Risk | Finance values are mock/demo-only until real gateway integration. | Use the visible finance note and do not present values as real settlement or payout data. |
| Demo Risk | Dashboard command-center data may depend on seeded/demo states. | Present it as operational visibility over current demo data. |
| Post-RC1 Polish | Minor UI warnings and legacy styling remain. | Non-blocking; avoid focusing the demo on polish details. |
| Demo Risk | Production deployment has not been executed in this pass. | Present RC1 as locally/staging validated, not production launched. |
| Demo Risk | Running `next build` while a dev server is active can corrupt generated `.next` artifacts. | Stop the affected dev server before builds; clear `.next` and restart if a dev server begins returning 500. |

## Documents Index

- **Demo Script**: [demo-script-rc1.md](./demo-script-rc1.md)
- **Manual QA Results**: [manual-qa-results-rc1.md](../03-quality/manual-qa-results-rc1.md)
- **Deferred Issues Backlog**: [post-rc1-backlog.md](../08-product/post-rc1-backlog.md)

## Next Recommended Step

- `Proceed to MVP demo using the stable RC1 path`
