# INFRASTRUCTURE

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Infrastructure layer provides the foundation that supports every Flux Tickets application and service.

Its responsibility is to ensure availability, scalability, security, observability, and operational reliability without affecting business logic.

Infrastructure should remain transparent to application development.

---

# Objectives

Infrastructure is responsible for:

- Service availability
- Horizontal scalability
- Network communication
- Persistent storage
- Background processing
- Monitoring
- Logging
- Disaster recovery
- Secure configuration

Applications should remain independent from infrastructure providers.

---

# Core Components

Current infrastructure consists of:

```text
PostgreSQL

Redis

api-read

api-write

ticket-worker

client

dashboard

staff-pwa
```

Future infrastructure components include:

```text
Prometheus

Grafana

Alert Manager

Object Storage

CDN
```

---

# Logical Architecture

```text
Users

↓

Reverse Proxy

↓

Frontend Applications

↓

api-read

api-write

↓

PostgreSQL

Redis

↓

ticket-worker
```

Business communication always occurs through backend APIs.

---

# PostgreSQL

PostgreSQL is the platform's source of truth.

Responsibilities:

- Business entities
- Transactions
- Constraints
- Audit data
- Ticket lifecycle

Every permanent business state is stored here.

---

# Redis

Redis provides transient operational data.

Responsibilities:

- Reservation locks
- BullMQ backend
- Distributed locks
- Temporary cache

Redis is never the authoritative source of business information.

---

# API Services

Infrastructure currently hosts:

```text
api-read

api-write
```

These services scale independently.

---

# Worker Service

The worker infrastructure processes:

- queues
- retries
- dead-letter jobs
- asynchronous business events

Workers consume BullMQ queues backed by Redis.

---

# Networking

Internal communication occurs over private networking.

External traffic reaches only:

```text
client

dashboard

staff-pwa

api-read

api-write
```

Workers remain inaccessible from the public Internet.

---

# DNS

Recommended subdomains:

```text
app.example.com

dashboard.example.com

staff.example.com

api.example.com
```

Internal services should not require public DNS.

---

# Reverse Proxy

Responsibilities:

- HTTPS
- Routing
- Compression
- Static asset delivery
- Future rate limiting

Backend services remain unaware of proxy implementation.

---

# TLS

All public traffic should use HTTPS.

Recommended:

```text
TLS 1.3
```

Certificates should be automatically renewed.

---

# Service Isolation

Every service executes independently.

Failure example:

```text
ticket-worker Offline

↓

api-write Continues

↓

api-read Continues
```

Asynchronous processing resumes once workers recover.

---

# Environment Configuration

Configuration is supplied through environment variables.

Required examples:

```text
DATABASE_URL

REDIS_URL

JWT_SECRET

HMAC_SECRET

APP_ENV
```

Optional:

```text
SENTRY_DSN

PROMETHEUS_ENABLED

SERVICE_VERSION

GIT_COMMIT
```

Configuration never belongs inside application code.

---

# Resource Separation

Infrastructure separates:

- compute
- storage
- networking
- logging
- monitoring

Each component may scale independently.

---

# Storage

Persistent storage includes:

```text
PostgreSQL

Future Object Storage
```

Future object storage may contain:

- PDFs
- Event images
- Half-price documents
- Wallet files

Business metadata remains inside PostgreSQL.

---

# Static Assets

Future CDN responsibilities:

- Event banners
- Images
- PDFs
- Static application assets

Static delivery should never involve backend services when avoidable.

---

# Queue Infrastructure

BullMQ uses Redis for:

- queue state
- retries
- scheduling
- delayed jobs

Workers remain horizontally scalable.

---

# Health Monitoring

Infrastructure health is verified through:

```http
GET /health/live

GET /health/ready
```

Every backend service exposes identical operational endpoints.

---

# Version Endpoint

Each deployed service exposes:

```http
GET /version
```

Version information assists operational diagnostics.

---

# Metrics

Metrics become available through:

```http
GET /metrics
```

when:

```text
PROMETHEUS_ENABLED=true
```

Metrics integrate with external monitoring systems.

---

# Logging

Infrastructure standardizes structured logging through Pino.

Logs include:

- service
- requestId
- latency
- queueName
- jobId

Sensitive information is automatically redacted.

---

# Observability

Infrastructure integrates:

- Pino
- Sentry
- Prometheus
- Health endpoints
- Queue monitoring

These systems provide complete operational visibility.

---

# Current Infrastructure Status

Implemented:

- PostgreSQL
- Redis
- BullMQ
- Request IDs
- Structured Logging
- Health Checks
- Version Endpoints
- Prometheus Metrics
- Queue Monitoring
- Optional Sentry

Future infrastructure enhancements are documented in Part 2.

---

# Next Section

Part 2 documents:

- Scaling
- High availability
- Backup strategy
- Disaster recovery
- Security
- Monitoring
- Future infrastructure roadmap

---
---

# Horizontal Scaling

Infrastructure is designed around independent scaling.

Each component may increase capacity without requiring changes to the rest of the platform.

Examples:

```text
api-read ×10

api-write ×4

ticket-worker ×8
```

Scaling decisions should be based on workload rather than fixed infrastructure.

---

# High Availability

Critical services should remain available during infrastructure failures.

Recommended redundancy:

```text
api-read

↓

Multiple Instances
```

```text
api-write

↓

Multiple Instances
```

```text
ticket-worker

↓

Multiple Instances
```

Infrastructure failures should degrade gracefully.

---

# Redis Availability

Redis should support:

- BullMQ
- Distributed Locks
- Reservation Cache

Recommended topology:

```text
Primary

↓

Replica

↓

Automatic Failover
```

Redis outages should never corrupt business data.

---

# PostgreSQL Availability

Production recommendations:

- automated backups
- WAL archiving
- connection pooling
- point-in-time recovery
- future read replicas

PostgreSQL remains the single source of truth.

---

# Connection Pooling

Every backend service should use pooled database connections.

Benefits:

- lower latency
- better resource utilization
- predictable scaling

Connection limits should be monitored continuously.

---

# Backup Strategy

Backups should include:

Database:

```text
Daily Snapshot

+

Continuous WAL Archive
```

Configuration:

- environment variables
- infrastructure definitions
- deployment manifests

Application code is already version-controlled.

---

# Disaster Recovery

Infrastructure should define:

Recovery Point Objective (RPO)

Example:

```text
≤ 15 minutes
```

Recovery Time Objective (RTO)

Example:

```text
≤ 1 hour
```

Targets should evolve as operational requirements grow.

---

# Monitoring Stack

Recommended monitoring stack:

```text
Prometheus

↓

Grafana

↓

Alert Manager
```

The current APIs already expose the necessary metrics.

---

# Dashboards

Suggested operational dashboards:

Infrastructure

- CPU
- Memory
- Disk
- Network

Application

- HTTP Latency
- Request Rate
- Error Rate

Workers

- Queue Depth
- Retry Count
- Dead Letters

Database

- Query Duration
- Connection Count

Redis

- Memory
- Latency
- Connected Clients

---

# Alerts

Critical alerts:

```text
Database Offline

Redis Offline

Worker Offline

Queue Explosion

Migration Failure
```

Warning alerts:

```text
High Latency

Retry Growth

Dead Letter Growth

Slow Queries
```

Alerts should be actionable.

---

# Log Aggregation

Future production deployments should centralize logs.

Possible stack:

```text
Pino

↓

Fluent Bit

↓

Loki

↓

Grafana
```

or

```text
Pino

↓

Elastic Stack
```

Centralized logs simplify incident investigation.

---

# Secrets Management

Secrets should never reside inside the repository.

Recommended providers:

```text
Docker Secrets

HashiCorp Vault

AWS Secrets Manager

Azure Key Vault

Google Secret Manager
```

Applications consume secrets only at runtime.

---

# Infrastructure Security

Infrastructure should enforce:

- HTTPS
- Firewall Rules
- Private Networking
- Database Authentication
- Redis Authentication
- Secret Rotation
- Least Privilege

Infrastructure security complements application security.

---

# Resource Monitoring

Infrastructure should continuously monitor:

- CPU
- Memory
- Storage
- Network
- Queue Size
- Worker Throughput
- API Latency

Capacity planning should be based on historical metrics.

---

# Maintenance

Operational maintenance includes:

- dependency updates
- database vacuum
- backup verification
- certificate renewal
- infrastructure patching

Maintenance should be scheduled to minimize customer impact.

---

# Capacity Planning

Future scaling decisions should consider:

- concurrent users
- active organizers
- event size
- queue throughput
- payment volume
- check-in rate

Infrastructure should grow with business demand.

---

# Future Infrastructure

Planned improvements include:

- Kubernetes
- Helm
- Docker Compose for development
- Terraform
- Object Storage
- CDN
- Multi-region deployment
- Read replicas
- Autoscaling
- Managed Redis

The application architecture already supports these additions.

---

# Infrastructure Principles

The Flux Tickets infrastructure is built upon:

- independent services
- horizontal scalability
- stateless applications
- reliable persistence
- observable systems
- secure configuration
- automated recovery

Infrastructure should enable platform growth without requiring changes to application business logic.

---

# INFRASTRUCTURE Complete

Together, Parts 1 and 2 define the complete infrastructure architecture of Flux Tickets, including networking, persistence, scaling, monitoring, disaster recovery, deployment strategy, and the long-term operational roadmap.

---
