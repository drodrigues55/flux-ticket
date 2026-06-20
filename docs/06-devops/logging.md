# LOGGING

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Logging subsystem provides a complete audit trail of every relevant operation performed by the Flux Tickets platform.

Logs are intended for:

- Operational diagnostics
- Incident investigation
- Performance analysis
- Security monitoring
- Business tracing

Logging is not a replacement for the Audit Log.

Business history and operational logs serve different purposes.

---

# Objectives

The logging strategy guarantees:

- Structured logs
- End-to-end request tracing
- Worker traceability
- Secure redaction
- Low overhead
- Machine-readable output

---

# Logging Architecture

```text
Application

↓

Pino Logger

↓

stdout

↓

Log Collector

↓

Storage

↓

Visualization
```

Future collectors may include:

- Loki
- Elastic Stack
- Datadog

---

# Logging Principles

Every log should be:

- Structured
- Consistent
- Contextual
- Searchable
- Secure

Logs should never require string parsing.

---

# Log Format

Logs are emitted as JSON.

Example:

```json
{
  "level": "info",
  "service": "api-write",
  "requestId": "...",
  "message": "...",
  "timestamp": "..."
}
```

This format is optimized for centralized aggregation.

---

# Services

Current services producing logs:

```text
api-read

api-write

ticket-worker
```

Every service follows the same logging conventions.

---

# Request Logs

HTTP requests produce logs containing:

```text
requestId

method

route

statusCode

latency

service
```

When available:

```text
userId

organizerId
```

---

# Worker Logs

Worker logs additionally include:

```text
queueName

jobId

attempt

duration
```

Worker executions should always be traceable back to the originating request.

---

# Request ID

Every request receives a unique identifier.

Propagation:

```text
Request

↓

API

↓

Database

↓

Outbox

↓

Queue

↓

Worker

↓

Logs
```

A single Request ID should reconstruct the complete execution flow.

---

# Log Levels

Current levels:

```text
trace

debug

info

warn

error

fatal
```

Recommended production level:

```text
info
```

Development environments may use:

```text
debug
```

---

# Error Logging

Unexpected failures produce:

```text
error
```

Logs include:

- requestId
- stack trace
- service
- route
- context

Stack traces remain server-side only.

---

# Validation Errors

Business validation failures are not operational failures.

Examples:

- Invalid DTO
- Reservation expired
- Ticket already consumed

These should typically log as:

```text
warn
```

or

```text
info
```

depending on context.

---

# Security Redaction

Sensitive fields are automatically removed.

Current redacted values include:

```text
Authorization

Bearer

JWT

CPF

Password

Secret

Card Number

CVV

CVC

HMAC

Raw Payment Payload
```

Applications should never manually redact fields.

---

# Payment Logs

Payment logs include:

```text
paymentId

provider

providerStatus

orderId

requestId
```

Sensitive gateway payloads remain hidden.

---

# Queue Logs

Queue logs include:

```text
queueName

jobId

attempt

status

duration
```

Dead-letter transitions should also be logged.

---

# Redis Logs

Redis connection events are logged through Pino.

Examples:

```text
Connected

Disconnected

Reconnect

Connection Error
```

Raw ioredis console output should not appear in production.

---

# Database Logs

Database logging focuses on:

- connectivity
- query latency
- failures

Individual SQL statements should not be logged by default in production.

---

# Observability Integration

Logging integrates with:

- Request IDs
- Sentry
- Prometheus
- Queue Monitoring

Together they provide complete operational visibility.

---

# Future Section

Part 2 documents:

- Centralized logging
- Correlation
- Performance logging
- Security logging
- Log retention
- Production recommendations
- Future roadmap

---
---

# Centralized Logging

Production environments should aggregate logs from every service into a centralized logging platform.

Recommended flow:

```text
api-read

api-write

ticket-worker

↓

stdout

↓

Log Collector

↓

Storage

↓

Visualization
```

This enables unified search and incident investigation.

---

# Log Correlation

Every log entry should be correlated using the Request ID.

Example:

```text
HTTP Request

↓

api-write

↓

Outbox

↓

Worker

↓

Database

↓

Response
```

Searching for a single Request ID should reconstruct the complete execution path.

---

# Correlation Fields

Recommended common fields:

```text
timestamp

service

requestId

level

message
```

Optional contextual fields:

```text
userId

organizerId

paymentId

ticketId

eventId

queueName

jobId
```

Consistent field naming simplifies analysis across services.

---

# Performance Logging

Latency should be logged for:

- HTTP requests
- Database queries
- Queue processing
- Worker execution

Example:

```text
Request

↓

Start Timer

↓

Execute

↓

Response

↓

Duration Logged
```

Performance metrics complement Prometheus monitoring.

---

# Slow Operations

Future versions may emit warnings when execution exceeds configured thresholds.

Examples:

HTTP:

```text
> 500 ms
```

Database:

```text
> 250 ms
```

Worker:

```text
> 5 s
```

Thresholds should remain configurable.

---

# Security Logging

Security-relevant events should always be logged.

Examples:

- Authentication failures
- Authorization failures
- Invalid HMAC signatures
- Invalid JWTs
- Duplicate webhook attempts
- Rejected check-ins

Security logs assist incident response without exposing sensitive information.

---

# Business Logging

Important business milestones may also be logged.

Examples:

```text
Reservation Created

Payment Approved

Ticket Issued

Check-in Accepted
```

Business logs complement immutable AuditLog records.

---

# Audit Log vs Application Log

These systems have different purposes.

Application Logs:

- operational diagnostics
- debugging
- infrastructure monitoring

Audit Logs:

- business history
- legal traceability
- ticket lifecycle
- financial events

Application logs may expire.

Audit records remain permanent.

---

# Log Retention

Suggested retention policy:

Development:

```text
7 Days
```

Staging:

```text
30 Days
```

Production:

```text
90–180 Days
```

AuditLog retention should follow legal and business requirements.

---

# Log Rotation

Applications should not manage log files directly.

Instead:

```text
stdout

↓

Container Runtime

↓

Log Collector

↓

Storage
```

Rotation is handled by infrastructure.

---

# Privacy

Logs should never contain:

- passwords
- payment credentials
- full card numbers
- CVV
- HMAC secrets
- JWT secrets
- raw provider payloads

Sensitive values are automatically redacted before serialization.

---

# Error Investigation

Recommended investigation flow:

```text
Alert

↓

Request ID

↓

Application Logs

↓

AuditLog

↓

Database

↓

Resolution
```

A Request ID should be sufficient to reconstruct most incidents.

---

# Logging in Development

Recommended level:

```text
debug
```

Development logs may include additional context while still respecting redaction rules.

---

# Logging in Production

Recommended level:

```text
info
```

Debug logging should only be enabled temporarily during incident investigations.

---

# Integration with Observability

Logging works together with:

- Prometheus Metrics
- Health Checks
- Sentry
- Queue Monitoring

Each component answers a different operational question:

Metrics answer:

```text
What is happening?
```

Logs answer:

```text
Why did it happen?
```

AuditLog answers:

```text
What business action occurred?
```

---

# Future Improvements

Planned enhancements include:

- OpenTelemetry trace IDs
- Distributed tracing
- Log sampling
- Dynamic log levels
- Structured business events
- Correlation with deployment versions

These additions build on the current structured logging foundation.

---

# Logging Principles

The Flux Tickets logging strategy is based on:

- structured output
- request correlation
- secure redaction
- operational visibility
- low overhead
- centralized aggregation

Logs should provide enough context to diagnose problems without exposing sensitive information.

---

# LOGGING Complete

Together, Parts 1 and 2 define the complete logging strategy of Flux Tickets, including structured logging, request tracing, security redaction, centralized aggregation, operational diagnostics, and long-term observability evolution.

---
