# Auth Hardening QA Procedures

This document tracks test validation workflows for verification of role controls and membership state blocks.

## 1. Automated Verification
Run all authorization and role checks in `@flux/api-write`:
```bash
npm test -w services/api-write
```
- Tests assert that draft deletions, draft publish commands, and cross-organization operations are guarded.
- Tests verify that users cannot escalate their own membership role in the organization.

## 2. Inactive Member Checks
- Attempting to perform organization profile updates or invitations with a disabled/suspended membership status will result in a `403 Forbidden` response.
