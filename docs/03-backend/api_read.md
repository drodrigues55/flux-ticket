# API_READ

> Version: 2.0
> Last Updated: June 2026

---

# Overview

`api-read` is the read-only service of the Flux Tickets platform.

Its responsibility is to expose optimized read models for every application while ensuring that no business state is modified.

Unlike `api-write`, this service never performs business transactions.

Its purpose is to serve fast, scalable, cache-friendly queries.

---

# Responsibilities

`api-read` is responsible for:

- Public event catalog
- Event details
- Organizer dashboard
- Dashboard analytics
- Staff offline bundles
- Ticket lookups
- Operational monitoring
- Health endpoints
- Version information
- Metrics exposure

It never creates, updates, or deletes business entities.

---

# Design Principles

The service follows these principles:

- Read-only
- Stateless
- Horizontally scalable
- Cache friendly
- Backend-driven calculations
- No business mutations
- Optimized queries

---

# Architecture

```text
Browser

↓

api-read

↓

Prisma

↓

PostgreSQL

↓

Response
```

No asynchronous jobs originate from this service.

---

# Consumers

Current consumers include:

```text
Consumer Portal

Organizer Dashboard

Staff PWA

Future Mobile Apps

Future Public APIs
```

Each application receives data already prepared for presentation.

---

# Request Lifecycle

Every request follows the same pipeline.

```text
HTTP Request

↓

Request ID

↓

Authentication (when required)

↓

Authorization

↓

Validation

↓

Controller

↓

Read Service

↓

Database

↓

Response
```

No transactions modify business state.

---

# Controllers

Controllers are intentionally lightweight.

Responsibilities:

- validate parameters
- call read services
- return standardized envelopes

Business calculations remain inside the service layer.

---

# Read Services

Examples include:

```text
EventsService

DashboardService

StaffBundleService

HealthService

MonitoringService
```

Each service owns one read domain.

---

# Event Catalog

Provides:

- event listings
- filtering
- pagination
- categories
- organizers
- availability

Optimized for high read throughput.

---

# Organizer Dashboard

Current endpoints include:

```http
GET /dashboard/overview

GET /dashboard/priority-event

GET /dashboard/events-priority

GET /dashboard/events/:eventId/lots-performance

GET /dashboard/alerts
```

All dashboard calculations occur on the backend.

The frontend only renders returned data.

---

# Dashboard Calculations

Examples include:

- gross revenue
- ticket sales
- average ticket
- occupancy
- check-ins
- lot performance
- operational alerts
- priority score

No KPI is calculated inside React.

---

# Staff Offline Bundle

Provides offline validation data.

Bundle contains:

- events
- tickets
- signatures
- ticket status
- sectors
- bundle metadata

Sensitive payment information is never included.

---

# Read Optimization

Queries should prioritize:

- indexed lookups
- aggregation
- projection
- pagination

Business entities should never be loaded unnecessarily.

---

# Analytics

Current analytics are calculated from transactional tables.

Future versions may consume:

- materialized views
- aggregation tables
- analytics snapshots

without changing public contracts.

---

# Standard Response Envelope

Successful responses follow the Phase 1 contract.

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

---

# Error Envelope

Errors always return:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "statusCode": 404,
    "requestId": "...",
    "details": {}
  }
}
```

No stack traces are exposed.

---

# Authentication

Public endpoints:

- event catalog
- event details

Protected endpoints:

- organizer dashboard
- monitoring
- staff bundles

JWT authentication is applied where required.

---

# Authorization

RBAC protects organizer-specific resources.

Examples:

```text
Organizer

↓

Own Events Only
```

Dashboard data is always scoped to the authenticated organizer.

---

# Health Endpoints

Available endpoints:

```http
GET /health/live

GET /health/ready
```

Readiness verifies:

- database
- Redis (when required)
- service dependencies

---

# Monitoring

Available endpoints:

```http
GET /metrics

GET /version
```

Metrics are available only when:

```text
PROMETHEUS_ENABLED=true
```

---

# Logging

Structured Pino logs include:

```text
requestId

route

method

statusCode

latency

organizerId
```

Sensitive values are automatically redacted.

---

# Observability

Optional Sentry integration captures:

- unexpected exceptions
- rejected promises

Business validation errors are not reported.

---

# Scalability

`api-read` is designed for aggressive horizontal scaling.

Example:

```text
api-read ×10
```

Because it performs no business mutations, additional instances require no coordination beyond shared infrastructure.

---

# Performance Guidelines

Read endpoints should:

- avoid N+1 queries
- project only required fields
- paginate large datasets
- aggregate in SQL whenever practical

Expensive dashboard calculations should gradually migrate toward materialized analytics.

---

# Future Evolution

Future read capabilities include:

- public search
- recommendation engine
- cached analytics
- reporting APIs
- financial dashboards
- marketing dashboards
- administrative dashboards

These additions extend existing services without changing architectural principles.

---

# API_READ Principles

The `api-read` service guarantees:

- read-only execution
- backend-owned calculations
- scalable query performance
- standardized contracts
- complete observability
- deterministic responses

It is the authoritative read interface for every Flux Tickets application.

---

# API_READ Complete

This document defines the architecture, responsibilities, request lifecycle, dashboard integration, monitoring, and scalability strategy of the `api-read` service.

---
# OBSERVABILITY

> Version: 2.0  
> Last Updated: June 2026

---

# Overview

Observability is responsible for making every component of the Flux Tickets platform measurable, traceable, and diagnosable.

The goal is not only to detect failures, but to understand:

- what happened
- where it happened
- why it happened
- who was affected
- how to recover

Observability is implemented across every service.

---

# Objectives

The observability stack provides:

- Health checks
- Metrics
- Structured logging
- Request tracing
- Exception monitoring
- Queue monitoring
- Worker monitoring
- Business metrics

Together, these provide complete visibility into the platform.

---

# Components

Current observability components:

```text
Pino

↓

Request ID

↓

Health Endpoints

↓

Prometheus Metrics

↓

Sentry

↓

Queue Monitoring
```

---

# Request ID

Every HTTP request receives a unique Request ID.

Flow:

```text
HTTP Request

↓

Request ID Middleware

↓

Controller

↓

Business Service

↓

Database

↓

Outbox

↓

Worker

↓

Logs
```

The Request ID allows complete end-to-end tracing.

---

# Structured Logging

All services use Pino.

Current services:

```text
api-read

api-write

ticket-worker
```

Logs are emitted in structured JSON.

---

# Common Log Fields

Every log should include:

```text
timestamp

level

service

requestId

message
```

Additional fields depend on context.

---

# HTTP Logs

Request logs include:

```text
route

method

statusCode

latency

userId

organizerId
```

Sensitive values are automatically removed.

---

# Worker Logs

Worker logs additionally include:

```text
queueName

jobId

attempt

duration
```

This makes asynchronous execution fully traceable.

---

# Redacted Fields

The logger automatically redacts sensitive information.

Examples:

```text
Authorization

Bearer Tokens

JWT

HMAC

CPF

Card Number

CVV

Password

Secrets

Raw Payment Payload
```

Sensitive information must never appear in logs.

---

# Health Endpoints

Every API exposes:

```http
GET /health/live

GET /health/ready
```

These endpoints serve different purposes.

---

# Liveness Probe

Endpoint:

```http
GET /health/live
```

Purpose:

Verify that the application process is alive.

Liveness does **not** depend on:

- Database
- Redis
- External providers

---

# Readiness Probe

Endpoint:

```http
GET /health/ready
```

Purpose:

Verify whether the service is ready to receive traffic.

Checks include:

- PostgreSQL
- Redis
- Queue state
- Critical dependencies

---

# Health Response

Typical response:

```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok",
  "queues": "ok"
}
```

Degraded services return:

```http
503 Service Unavailable
```

with detailed component status.

---

# Version Endpoint

Every service exposes:

```http
GET /version
```

Typical response:

```json
{
  "service": "...",
  "version": "...",
  "environment": "...",
  "commit": "...",
  "uptime": 12345,
  "buildTimestamp": "..."
}
```

This simplifies production diagnostics.

---

# Metrics

Metrics are exposed through:

```http
GET /metrics
```

Only when:

```text
PROMETHEUS_ENABLED=true
```

Otherwise the endpoint returns:

```http
404
```

---

# Current Metrics

Metrics include:

```text
HTTP Requests

HTTP Latency

Database Connectivity

Database Query Duration

Redis Connectivity

BullMQ Jobs

Business Totals
```

Business totals include:

- reservations
- orders
- payments
- tickets
- check-ins

---

# Queue Monitoring

Operational queue information is exposed through:

```http
GET /monitoring/queues
```

Returned data includes:

- waiting
- active
- delayed
- completed
- failed
- dead-letter

Current queues include:

```text
payments.webhook

payments.recoverPending

tickets.issue

checkins.sync

analytics.aggregate

waitlist.invite

carts.expireAbandoned

notifications.placeholder
```

---

# Sentry

Sentry integration is optional.

Initialization occurs only when:

```text
SENTRY_DSN
```

is configured.

Without a DSN, services continue normally.

---

# Captured Exceptions

Sentry captures:

- uncaught exceptions
- rejected promises
- worker failures
- unexpected runtime errors

Business validation errors are intentionally ignored.

---

# Performance Monitoring

Latency is recorded for every HTTP request.

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

Record Duration
```

This enables performance trend analysis.

---

# Redis Monitoring

Redis health includes:

- connectivity
- reconnection
- command failures

Connection errors are logged through Pino instead of raw ioredis output.

---

# Database Monitoring

Database monitoring records:

- connectivity
- query duration
- availability

Slow queries may be identified through latency metrics.

---

# Production Recommendations

Production deployments should integrate:

```text
Prometheus

↓

Grafana

↓

Alert Manager
```

Suggested dashboards:

- API latency
- Queue depth
- Failed jobs
- HTTP errors
- Worker throughput

---

# Future Evolution

Planned observability improvements include:

- OpenTelemetry
- Distributed tracing
- Database slow query dashboard
- Queue latency dashboard
- Business KPI dashboards
- Automatic anomaly detection

These additions extend the existing observability model without changing application behavior.

---

# Observability Principles

The Flux Tickets observability stack guarantees:

- complete request traceability
- structured logging
- measurable performance
- reliable health checks
- optional exception tracking
- production-ready metrics

Observability is considered a core platform capability rather than an optional operational feature.

---

# OBSERVABILITY Complete

This document defines the complete monitoring, logging, tracing, metrics, and health strategy adopted across every Flux Tickets service.

---
