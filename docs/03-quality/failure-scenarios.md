# Critical Failure Scenarios

This document analyzes high-risk failure modes, their mitigation, and reproduction commands.

## Concurrency: Overselling Lock Protections
- **Risk**: Multiple users reserving the final ticket concurrently.
- **Mitigation**: Redis stock updates run inside atomic locks. The reservation request checks available tickets before generating locks.
- **Verification**: `npm run test --workspace @flux/api-write` (covers `concurrency simulation` test).

## Unsafe State Transitions
- **Risk**: Deleting active/published events or changing ticket prices after orders exist.
- **Mitigation**: Server-side status checks block DELETE/PUT mutations unless the status is in `DRAFT`.
- **Verification**: Covered by `failure-scenarios.test.ts`.

## Offline Synchronization Conflict
- **Risk**: Offline check-ins conflict with remote status (e.g. ticket revoked/changed).
- **Mitigation**: The synchronization process verifies HMAC signatures and detects duplicates against online records.
- **Verification**: Covered by `staff-portal.test.ts`.

## QA-2 Updates: Frontend Error Handlers
- **Dashboard & client requestIds**: Error modals are guaranteed to extract and present `meta.requestId` to simplify troubleshooting.
- **Stale/Expired Reservations**: Clients receive real-time warnings when reservation session countdowns expire.
