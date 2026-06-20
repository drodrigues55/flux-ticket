# ADR-006 — Offline-First Staff PWA

Status: Accepted

Date: 2026-06-19

Authors: Flux Tickets Team

---

# Context

Many events occur in environments with unstable or unavailable Internet connectivity.

Examples include:

- Farms
- Outdoor festivals
- Rodeos
- Arenas
- Rural venues
- Temporary event infrastructure

Ticket validation must continue even when connectivity is lost.

The platform therefore cannot depend exclusively on real-time API requests.

---

# Decision

Flux Tickets adopts an **Offline-First PWA** for staff operations.

The application downloads a signed validation bundle before the event.

Architecture:

```text
api-read

↓

Offline Bundle

↓

IndexedDB

↓

Staff PWA

↓

Offline Validation
```

Synchronization occurs automatically whenever connectivity returns.

---

# Offline Bundle

Bundles contain only the information required for validation.

Examples:

- event metadata
- ticket identifiers
- ticket signatures
- sector permissions
- synchronization metadata

Bundles never include:

- payment information
- customer financial data
- authentication secrets

---

# Validation Flow

Offline validation:

```text
Scan QR

↓

Validate Signature

↓

Lookup IndexedDB

↓

Business Rules

↓

Accept or Reject
```

No Internet connection is required.

---

# Synchronization

When connectivity returns:

```text
Offline Check-ins

↓

Sync Queue

↓

api-write

↓

Conflict Detection

↓

Database
```

Synchronization is idempotent.

Duplicate uploads do not create duplicate check-ins.

---

# Operator Identification

For the MVP, operators identify themselves using:

- Full Name
- CPF

No authentication is required.

Every synchronized check-in records:

- operator name
- operator CPF
- device identifier (future)

Future versions will replace this flow with authenticated Staff accounts.

---

# Alternatives Considered

## Online-Only Validation

Pros

- Simpler implementation

Cons

- Stops working without Internet
- Unsuitable for rural events

Rejected.

---

## Native Mobile Application

Pros

- Better hardware integration

Cons

- Two codebases
- Higher maintenance cost

Rejected.

---

## Local Server at Venue

Pros

- Centralized validation

Cons

- Additional hardware
- Operational complexity

Rejected.

---

# Consequences

Positive

- Works without Internet
- Better user experience
- Faster validation
- Lower operational risk
- Progressive enhancement

Negative

- Synchronization complexity
- Conflict resolution required
- Offline bundle generation required

These trade-offs are acceptable.

---

# Future Considerations

Future improvements include:

- authenticated staff accounts
- registered devices
- biometric authentication
- QR rotation support
- encrypted offline bundles
- automatic bundle expiration
- push synchronization

The Offline-First architecture supports these enhancements without requiring structural changes.

---

# Related Documents

- 05-ui/staff-pwa.md
- 02-architecture/offline-validation.md
- 02-architecture/ticket_engine.md
- 02-architecture/workers.md
- 03-backend/api_write.md

---