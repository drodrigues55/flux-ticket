# Gate Operations Runbook

This guide contains operational tasks for gate managers using the Flux Tickets Staff PWA.

## 1. PWA Initialization & Device Setup
1. Open the PWA at `http://localhost:3000` (or local gate network address).
2. Enter the Operator Name and CPF.
3. Select the active event to load the scanner dashboard.
4. If online, click "Baixar Assinaturas Offline" to cache ticket signatures. The readiness banner should change to `PRONTO`.

## 2. Handling Offline Warnings
- If the bundle age exceeds 180 minutes, the PWA displays: `⚠️ Carga desatualizada!`.
- If a network connection is available, click "Baixar Assinaturas Offline" to renew the cache.
- If network connection is dead, keep checking in tickets; edge verification will validate cryptographically.

## 3. Conflict Resolution
- **Ticket Already Checked In**: Displays red error indicating duplicates. Check the buyer's ID card for identity verification.
- **Malformed QR**: Scanner will fail to parse and trigger warning alerts. Try manually looking up the ticket using "Manual Attendee Lookup" tab.
