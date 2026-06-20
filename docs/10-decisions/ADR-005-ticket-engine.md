# ADR-005 — Ticket Engine

Status: Accepted

Date: 2026-06-19

Authors: Flux Tickets Team

---

# Context

Tickets are the primary business asset of the Flux Tickets platform.

Every issued ticket must satisfy several requirements:

- globally unique
- impossible to forge
- verifiable offline
- printable
- compatible with Apple Wallet
- compatible with Google Wallet
- compatible with PDF delivery
- compatible with future QR rotation

The same ticket may be presented through multiple channels.

Examples:

- Consumer Portal
- Apple Wallet
- Google Wallet
- PDF
- Email
- Future Mobile Apps

Maintaining different QR Codes for each channel would create synchronization problems and increase operational complexity.

---

# Decision

Flux Tickets adopts a centralized **Ticket Engine**.

Each ticket owns exactly one immutable identity.

Every delivery channel references the same ticket.

Architecture:

```text
Ticket

↓

Ticket Engine

↓

Signed Payload

↓

QR Code

↓

Portal

Apple Wallet

Google Wallet

PDF

Email
```

The Ticket Engine is the only component allowed to generate QR payloads.

---

# Ticket Identity

Every ticket receives a globally unique identifier.

Example:

```text
ticketId
```

This identifier never changes during the ticket lifecycle.

Other attributes may change, but the identity remains immutable.

---

# QR Payload

The QR Code intentionally stores only the minimum information required.

Example:

```json
{
    "ticketId":"...",
    "version":1,
    "signature":"..."
}
```

Customer information is never embedded inside the QR Code.

---

# HMAC Signature

Every payload is signed using HMAC.

Validation flow:

```text
Scan QR

↓

Parse Payload

↓

Validate Signature

↓

Database Lookup

↓

Business Validation
```

Tampered QR Codes are immediately rejected.

---

# Ticket Validation

The Ticket Engine validates:

- ticket existence
- ticket status
- event
- check-in state
- signature
- expiration (future)
- rotation version (future)

Validation logic exists exclusively in the backend.

---

# Alternatives Considered

## QR Contains Complete Ticket

Pros

- Offline without database

Cons

- Large QR
- Exposes personal information
- Difficult to revoke
- Difficult to evolve

Rejected.

---

## Different QR Per Platform

Pros

- Platform-specific customization

Cons

- Multiple sources of truth
- Synchronization issues
- More complex support

Rejected.

---

## Unsigned UUID

Pros

- Simple implementation

Cons

- Easy forgery
- Enumeration attacks
- No authenticity validation

Rejected.

---

# Consequences

Positive

- Single ticket identity
- One QR for every platform
- Wallet compatibility
- PDF compatibility
- Easier support
- Stronger security

Negative

- Requires backend validation
- Offline mode requires signed bundle

These trade-offs are considered acceptable.

---

# Future Considerations

Future Ticket Engine capabilities include:

- QR rotation
- ticket transfer
- ticket revocation
- ticket reissue
- versioned signatures
- anti-screenshot mechanisms

The current architecture already supports these future enhancements.

---

# Related Documents

- 02-architecture/ticket_engine.md
- 02-architecture/ticket-lifecycle.md
- 05-ui/staff-pwa.md
- 03-backend/api_write.md

---
