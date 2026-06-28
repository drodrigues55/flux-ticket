# Staff PWA Architecture

The Staff Portal / PWA is designed to allow gate operators to validate issued tickets offline, checking QR signatures securely at the event boundaries.

## 1. Identity & Auth Persistence
- Operator Name and CPF are queried on first entrance and saved to `localStorage` for session/device persistence.
- Identity credentials are embedded into check-in metadata and mutation queue items for audit trailing.

## 2. Offline Bundle Storage
- Cryptographic ticket signatures (`hmacSignature`) and allowed sector IDs are synced when online and saved locally using Dexie.js (IndexedDB).
- Caches store timestamps to calculate bundle age and trigger warnings when the dataset grows older than 3 hours.

## 3. Camera Scanner Mechanics
- Relies on HTML5 QR Code library to interface native camera frames.
- Permission requests, permission denied alerts, and missing camera issues are captured and handled dynamically to display clean user warnings.
