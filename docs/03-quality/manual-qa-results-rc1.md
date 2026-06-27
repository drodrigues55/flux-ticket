# Manual QA Results - RC1

Manual QA successfully executed for Release Candidate 1.

## Verification Scenarios

| Area | Scenario | Status | Tester | Date | Environment | Notes | Blocker |
| ---- | -------- | ------ | ------ | ---- | ----------- | ----- | ------- |
| **Organizer** | Create organization and invite manager | PASS | QA Team | 2026-06-27 | Local Dev | Verified org onboarding and default seeds | No |
| **Organizer** | Create event, batch, validate and publish | PASS | QA Team | 2026-06-27 | Local Dev | Blockers and warnings correctly toggle publish | No |
| **Consumer** | Browse event, select tickets, reserve, mock pay | PASS | QA Team | 2026-06-27 | Local Dev | End-to-end checkout operates cleanly | No |
| **Staff** | Login, download offline bundle, scan QR codes | PASS | QA Team | 2026-06-27 | Local Dev | Offline validation and HMAC verify pass | No |
| **Failure** | Prevent buying tickets for unpublished events | PASS | QA Team | 2026-06-27 | Local Dev | Correctly blocks public views | No |
| **Failure** | Prevent checkout with expired reservations | PASS | QA Team | 2026-06-27 | Local Dev | Checkout rejects expired sessions | No |
