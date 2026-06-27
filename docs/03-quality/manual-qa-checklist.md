# Manual QA Checklist

Step-by-step instructions to verify the MVP ticketing cycle manually.

## 1. Organizer Dashboard Verification
1. Open dashboard browser at `/events/new`.
2. Fill basic info step and verify saving as `DRAFT`.
3. Fill ticket details and proceed.
4. Verify validation warnings and blocker checklists before publishing.
5. Publish the event and confirm state becomes `PUBLISHED`.

## 2. Consumer Client Verification
1. Go to client app `/events` catalog.
2. Confirm the published event is visible and click "Ver Ingressos".
3. Select ticket quantities, click "Comprar", and verify reservation countdown timer.
4. Enter payment details, click "Finalizar", and confirm redirect to `/orders/[orderId]/confirmation`.

## 3. Staff PWA Gate Verification
1. Open `/login` on Staff PWA, enter operator CPF and Name.
2. Select the event and click "Baixar Assinaturas Offline".
3. Open Scanner or simulate valid/invalid scans.
4. Verify check-ins are logged locally and synced once connectivity is restored.

---

## QA-2 Updates: Device / Network Scenarios
- **Desktop Chrome / Safari**: Validate that clicking "Reenviar E-mail" displays a progress indicator and transitions to a success message.
- **Offline / Stale State**: Verify that loading the Staff PWA offline allows local search lookups via IndexedDB.
