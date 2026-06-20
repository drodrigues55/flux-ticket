# SECURITY

> Version: 2.0
> Last Updated: June 2026

---

# Overview

Security is a first-class concern in the Flux Tickets platform.

Rather than relying on a single protection mechanism, the platform applies multiple independent security layers.

Each layer protects a different part of the system.

Compromising one layer must never compromise the platform.

---

# Security Principles

The platform follows these principles:

- Defense in Depth
- Least Privilege
- Zero Trust
- Backend as Source of Truth
- Idempotent Operations
- Immutable Audit Trail
- Secure Defaults

---

# Security Layers

```text
Client

↓

HTTPS

↓

JWT Authentication

↓

RBAC Authorization

↓

Validation

↓

Business Rules

↓

Database Constraints

↓

Audit

↓

Observability
```

Every request passes through multiple validation stages.

---

# Authentication

Flux Tickets uses JWT authentication.

Flow:

```text
Login

↓

JWT

↓

Authorization Header

↓

Backend
```

The backend validates every request.

No frontend state is trusted.

---

# Authorization

Authorization is based on Role-Based Access Control (RBAC).

Current roles:

```text
ADMIN

ORGANIZER

STAFF

CUSTOMER
```

Each endpoint validates permissions before executing business logic.

---

# Organizer Isolation

Every organizer is isolated.

Example:

```text
Organizer A

↓

Own Events
```

```text
Organizer B

↓

Own Events
```

Cross-organizer access is never permitted.

---

# Backend Authority

The frontend never decides:

- payment approval
- ticket validity
- reservation ownership
- ticket issuance
- check-in acceptance

Every decision belongs to backend services.

---

# Input Validation

Every request validates:

- required fields
- UUID format
- enum values
- payload structure
- business rules

Malformed requests never reach business logic.

---

# HMAC Signatures

Every ticket QR Code is protected using HMAC.

Example payload:

```json
{
    "ticketId":"...",
    "version":1,
    "signature":"..."
}
```

The signature prevents QR forgery.

---

# Signature Validation

Validation flow:

```text
Scan QR

↓

Parse Payload

↓

Validate HMAC

↓

Database Lookup

↓

Business Rules
```

Invalid signatures terminate validation immediately.

---

# QR Protection

QR Codes intentionally contain minimal information.

They never include:

- customer name
- CPF
- email
- payment status
- event secrets

The QR contains only what is necessary to identify the ticket.

---

# Request Validation

Every API request validates:

```text
Authentication

↓

Authorization

↓

DTO

↓

Business Rules

↓

Database
```

Skipping validation layers is not permitted.

---

# Idempotency

Critical business operations are idempotent.

Protected flows include:

- payment approval
- ticket issuance
- webhook processing
- offline synchronization

Duplicate execution never creates duplicate business effects.

---

# Distributed Locks

Critical write operations use Redis locks.

Examples:

```text
Payment Approval

↓

Redis Lock
```

```text
Ticket Issuance

↓

Redis Lock
```

Locks protect against concurrent execution.

---

# Database Constraints

Security is reinforced by database constraints.

Examples:

```text
Unique Payment

Unique Accepted Check-in

Unique Provider Event

Unique Idempotency Key
```

Business validation is complemented by database enforcement.

---

# Audit Logging

Every critical action generates an immutable AuditLog.

Examples:

- payment approved
- payment rejected
- ticket issued
- check-in accepted
- check-in rejected
- webhook received

Audit records are never modified.

---

# Ticket History

Ticket lifecycle changes are stored separately in:

```text
TicketStatusHistory
```

History records provide complete traceability of every ticket transition.

---

# Sensitive Data

Sensitive information is never exposed through APIs.

Examples:

- JWT secrets
- HMAC secrets
- provider credentials
- access tokens
- card data
- CVV
- raw webhook payloads

Only normalized business information is returned to clients.

---

# Logging Security

Structured logs automatically redact:

```text
Authorization

JWT

Bearer

CPF

Password

Secret

Card Number

CVV

HMAC

Raw Payment Payload
```

Operational logs remain useful without leaking sensitive data.

---

# Environment Variables

Secrets are stored exclusively in environment variables.

Examples:

```text
JWT_SECRET

HMAC_SECRET

DATABASE_URL

REDIS_URL

SENTRY_DSN
```

Secrets must never be committed to version control.

---

# Error Responses

Errors always follow the standardized API envelope.

Example:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "statusCode": 400,
    "requestId": "...",
    "details": {}
  }
}
```

Stack traces are never returned to clients.

---

# Observability

Security incidents remain observable through:

- Request IDs
- Structured Logs
- AuditLog
- Sentry
- Queue Monitoring

This enables incident investigation without exposing sensitive information.

---

# Current Security Features

Implemented:

- JWT Authentication
- RBAC
- HMAC Ticket Signatures
- Request IDs
- Audit Logging
- Ticket History
- Idempotent Processing
- Distributed Locks
- Structured Logging
- Sentry Integration
- Prometheus Metrics

---

# Planned Security Features

Future improvements include:

- Rate Limiting
- Device Fingerprinting
- CPF Validation
- Anti-enumeration
- Fraud Detection
- IP Rate Limits
- Device Registration
- Secret Rotation
- API Keys
- Web Application Firewall Integration

---

# Next Section

Part 2 documents:

- Payment security
- Webhook security
- Offline validation security
- Staff security
- Infrastructure security
- Operational security
- Incident response
- Future security roadmap

---
# SECURITY

> Version: 2.0
> Last Updated: June 2026

---

# Overview

Security is a first-class concern in the Flux Tickets platform.

Rather than relying on a single protection mechanism, the platform applies multiple independent security layers.

Each layer protects a different part of the system.

Compromising one layer must never compromise the platform.

---

# Security Principles

The platform follows these principles:

- Defense in Depth
- Least Privilege
- Zero Trust
- Backend as Source of Truth
- Idempotent Operations
- Immutable Audit Trail
- Secure Defaults

---

# Security Layers

```text
Client

↓

HTTPS

↓

JWT Authentication

↓

RBAC Authorization

↓

Validation

↓

Business Rules

↓

Database Constraints

↓

Audit

↓

Observability
```

Every request passes through multiple validation stages.

---

# Authentication

Flux Tickets uses JWT authentication.

Flow:

```text
Login

↓

JWT

↓

Authorization Header

↓

Backend
```

The backend validates every request.

No frontend state is trusted.

---

# Authorization

Authorization is based on Role-Based Access Control (RBAC).

Current roles:

```text
ADMIN

ORGANIZER

STAFF

CUSTOMER
```

Each endpoint validates permissions before executing business logic.

---

# Organizer Isolation

Every organizer is isolated.

Example:

```text
Organizer A

↓

Own Events
```

```text
Organizer B

↓

Own Events
```

Cross-organizer access is never permitted.

---

# Backend Authority

The frontend never decides:

- payment approval
- ticket validity
- reservation ownership
- ticket issuance
- check-in acceptance

Every decision belongs to backend services.

---

# Input Validation

Every request validates:

- required fields
- UUID format
- enum values
- payload structure
- business rules

Malformed requests never reach business logic.

---

# HMAC Signatures

Every ticket QR Code is protected using HMAC.

Example payload:

```json
{
    "ticketId":"...",
    "version":1,
    "signature":"..."
}
```

The signature prevents QR forgery.

---

# Signature Validation

Validation flow:

```text
Scan QR

↓

Parse Payload

↓

Validate HMAC

↓

Database Lookup

↓

Business Rules
```

Invalid signatures terminate validation immediately.

---

# QR Protection

QR Codes intentionally contain minimal information.

They never include:

- customer name
- CPF
- email
- payment status
- event secrets

The QR contains only what is necessary to identify the ticket.

---

# Request Validation

Every API request validates:

```text
Authentication

↓

Authorization

↓

DTO

↓

Business Rules

↓

Database
```

Skipping validation layers is not permitted.

---

# Idempotency

Critical business operations are idempotent.

Protected flows include:

- payment approval
- ticket issuance
- webhook processing
- offline synchronization

Duplicate execution never creates duplicate business effects.

---

# Distributed Locks

Critical write operations use Redis locks.

Examples:

```text
Payment Approval

↓

Redis Lock
```

```text
Ticket Issuance

↓

Redis Lock
```

Locks protect against concurrent execution.

---

# Database Constraints

Security is reinforced by database constraints.

Examples:

```text
Unique Payment

Unique Accepted Check-in

Unique Provider Event

Unique Idempotency Key
```

Business validation is complemented by database enforcement.

---

# Audit Logging

Every critical action generates an immutable AuditLog.

Examples:

- payment approved
- payment rejected
- ticket issued
- check-in accepted
- check-in rejected
- webhook received

Audit records are never modified.

---

# Ticket History

Ticket lifecycle changes are stored separately in:

```text
TicketStatusHistory
```

History records provide complete traceability of every ticket transition.

---

# Sensitive Data

Sensitive information is never exposed through APIs.

Examples:

- JWT secrets
- HMAC secrets
- provider credentials
- access tokens
- card data
- CVV
- raw webhook payloads

Only normalized business information is returned to clients.

---

# Logging Security

Structured logs automatically redact:

```text
Authorization

JWT

Bearer

CPF

Password

Secret

Card Number

CVV

HMAC

Raw Payment Payload
```

Operational logs remain useful without leaking sensitive data.

---

# Environment Variables

Secrets are stored exclusively in environment variables.

Examples:

```text
JWT_SECRET

HMAC_SECRET

DATABASE_URL

REDIS_URL

SENTRY_DSN
```

Secrets must never be committed to version control.

---

# Error Responses

Errors always follow the standardized API envelope.

Example:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "statusCode": 400,
    "requestId": "...",
    "details": {}
  }
}
```

Stack traces are never returned to clients.

---

# Observability

Security incidents remain observable through:

- Request IDs
- Structured Logs
- AuditLog
- Sentry
- Queue Monitoring

This enables incident investigation without exposing sensitive information.

---

# Current Security Features

Implemented:

- JWT Authentication
- RBAC
- HMAC Ticket Signatures
- Request IDs
- Audit Logging
- Ticket History
- Idempotent Processing
- Distributed Locks
- Structured Logging
- Sentry Integration
- Prometheus Metrics

---

# Planned Security Features

Future improvements include:

- Rate Limiting
- Device Fingerprinting
- CPF Validation
- Anti-enumeration
- Fraud Detection
- IP Rate Limits
- Device Registration
- Secret Rotation
- API Keys
- Web Application Firewall Integration

---

# Next Section

Part 2 documents:

- Payment security
- Webhook security
- Offline validation security
- Staff security
- Infrastructure security
- Operational security
- Incident response
- Future security roadmap
