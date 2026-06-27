# Staging Smoke Test Results

Staging smoke verification executed under local-staging simulation environments.

## Results Matrix
- **Target Environment**: Local Staging (Standard node process boundaries)
- **E2E Ticket Lifecycle**: PASS (Owner created, event manager setup, published, consumer reserved, checked out, issued, and staff validated QR code successfully).
- **Duplicate checkout submit protection**: PASS (Blocked with 429/400).
- **Wrong-event validation check**: PASS (PWA warns and blocks wrong-event check-ins).
- **Permission Boundary**: PASS (Finance user blocked from updating ticket types).
