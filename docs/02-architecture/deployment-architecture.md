# DEPLOYMENT

> Version: 2.0
> Last Updated: June 2026

---

# Overview

The Deployment architecture defines how the Flux Tickets platform moves from local development to production while maintaining consistency, observability, and reliability.

Deployments should be repeatable, automated, and reversible.

Every deployment must preserve data integrity and service availability.

---

# Objectives

Deployment is designed to provide:

- Zero data loss
- Safe migrations
- Repeatable releases
- Independent service deployment
- Horizontal scalability
- Fast rollback
- Full observability

---

# Deployment Architecture

```text
Git Repository

↓

CI Pipeline

↓

Build

↓

Tests

↓

Artifacts

↓

Staging

↓

Production
```

Every deployment follows the same lifecycle.

---

# Services

Each service is deployed independently.

Current services:

```text
api-read

api-write

ticket-worker
```

Frontend applications:

```text
client

dashboard

staff-pwa
```

Independent deployment minimizes downtime.

---

# Infrastructure

Core infrastructure consists of:

```text
PostgreSQL

Redis

Reverse Proxy
```

Future additions:

```text
Object Storage

CDN

Prometheus

Grafana

Alert Manager
```

---

# Deployment Order

Recommended deployment order:

```text
Database Migration

↓

api-write

↓

ticket-worker

↓

api-read

↓

Frontend Applications
```

Database migrations should always complete before services using new schema versions.

---

# Database Migrations

Deployment executes:

```bash
npx prisma migrate deploy
```

Only production migrations are allowed.

Development migrations should never execute in production.

---

# Prisma Client

After schema updates:

```bash
npx prisma generate
```

must execute before building backend services.

---

# Build

Every workspace builds independently.

Required commands:

```bash
npm run build --workspace @flux/api-read

npm run build --workspace @flux/api-write

npm run build --workspace @flux/ticket-worker

npm run build --workspace @flux/dashboard

npm run build --workspace @flux/client
```

A failed build blocks deployment.

---

# Environment Variables

Every environment provides its own configuration.

Required variables include:

```text
DATABASE_URL

REDIS_URL

JWT_SECRET

HMAC_SECRET

APP_ENV

LOG_LEVEL
```

Optional:

```text
SENTRY_DSN

SERVICE_VERSION

GIT_COMMIT

PROMETHEUS_ENABLED
```

Secrets are never stored in Git.

---

# Health Validation

Before accepting traffic:

```http
GET /health/live

GET /health/ready
```

must return healthy status.

Unhealthy services should not enter the load balancer.

---

# Version Validation

Each deployment exposes:

```http
GET /version
```

The endpoint should report:

- service
- version
- commit
- environment
- uptime
- build timestamp

This simplifies deployment verification.

---

# Monitoring

After deployment verify:

```text
Logs

↓

Metrics

↓

Queues

↓

Health

↓

Alerts
```

Monitoring begins immediately after rollout.

---

# Queue Safety

Workers should only start after:

- Redis availability
- Database readiness
- Queue registration

Starting workers before dependencies are available may generate unnecessary retries.

---

# Rollback

Rollback strategy:

```text
Deploy

↓

Failure

↓

Previous Artifact

↓

Restart Services
```

Database rollback should be avoided whenever possible.

Schema migrations should remain backward compatible during rolling deployments.

---

# Blue/Green Deployment (Future)

Future deployments may support:

```text
Blue Environment

↓

Validation

↓

Traffic Switch

↓

Green Environment
```

Traffic shifts only after successful validation.

---

# Canary Deployment (Future)

Possible rollout strategy:

```text
5%

↓

20%

↓

50%

↓

100%
```

Metrics determine whether rollout continues.

---

# Staging

Recommended environments:

```text
Development

↓

Testing

↓

Staging

↓

Production
```

Staging should closely mirror production infrastructure.

---

# Production Checklist

Before production:

- All builds pass
- Prisma migration applied
- Smoke tests pass
- Queue validation passes
- Concurrency tests pass
- Health endpoints healthy
- Metrics enabled
- Logs verified
- Sentry configured (optional)

---

# Future Deployment

Planned improvements:

- GitHub Actions
- Docker Images
- Kubernetes
- Horizontal Pod Autoscaling
- Automatic Rollback
- Multi-region Deployment
- Disaster Recovery
- Infrastructure as Code

---

# Deployment Principles

Flux Tickets deployments follow:

- immutable builds
- repeatable releases
- automated validation
- observable rollout
- independent services
- safe rollback

Deployments should always be deterministic and fully traceable.

---

# Next Section

Part 2 documents:

- CI/CD pipeline
- Docker strategy
- Kubernetes recommendations
- Scaling
- Backup strategy
- Disaster recovery
- Long-term infrastructure roadmap

---
---

# CI/CD Pipeline

The deployment pipeline should be fully automated.

Recommended workflow:

```text
Git Push

↓

Install Dependencies

↓

Lint

↓

Build

↓

Unit Tests

↓

Integration Tests

↓

Smoke Tests

↓

Concurrency Tests

↓

Queue Validation

↓

Artifact Creation

↓

Deploy
```

A deployment should never bypass automated validation.

---

# Artifact Strategy

Every deployment should generate immutable artifacts.

Examples:

```text
Docker Image

Build Bundle

Compiled Backend
```

The same artifact validated in staging should be deployed to production.

---

# Docker Strategy

Each service should run in its own container.

Example:

```text
api-read

api-write

ticket-worker

client

dashboard
```

Shared infrastructure:

```text
PostgreSQL

Redis
```

Containers should remain stateless.

---

# Reverse Proxy

A reverse proxy should expose public services.

Typical responsibilities:

- HTTPS
- Compression
- Caching
- Routing
- Rate limiting (future)

Possible implementations:

```text
NGINX

Traefik

Caddy
```

---

# Kubernetes (Future)

Future deployments may use Kubernetes.

Suggested layout:

```text
Deployment

↓

ReplicaSet

↓

Pods

↓

Service

↓

Ingress
```

Each backend service scales independently.

---

# Horizontal Scaling

Recommended scaling targets:

```text
api-read

↓

CPU Based
```

```text
api-write

↓

Request Based
```

```text
ticket-worker

↓

Queue Depth
```

Worker scaling should depend on queue backlog rather than HTTP traffic.

---

# Autoscaling

Future autoscaling metrics:

- CPU
- Memory
- Queue Depth
- HTTP Throughput
- Average Latency

Worker autoscaling should prioritize pending jobs.

---

# Session Strategy

Services remain stateless.

No session data should exist in memory.

Authentication relies exclusively on JWT.

This enables unrestricted horizontal scaling.

---

# Redis Availability

Redis is required for:

- BullMQ
- Distributed Locks
- Reservation Cache

Recommended deployment:

```text
Primary

↓

Replica

↓

Automatic Failover
```

---

# PostgreSQL Availability

Production recommendations:

- Daily backups
- WAL archiving
- Point-in-time recovery
- Connection pooling
- Read replicas (future)

Database integrity has higher priority than deployment speed.

---

# Backup Strategy

Recommended backups:

Database:

```text
Daily Full

↓

Continuous WAL
```

Application assets:

```text
Configuration

↓

Secrets

↓

Infrastructure Definitions
```

Backups should be tested periodically.

---

# Disaster Recovery

Recovery objectives:

Recovery Point Objective (RPO):

```text
< 15 minutes
```

Recovery Time Objective (RTO):

```text
< 1 hour
```

Exact targets depend on production infrastructure.

---

# Infrastructure Monitoring

Recommended monitoring stack:

```text
Prometheus

↓

Grafana

↓

Alert Manager
```

Dashboards should include:

- API Latency
- Worker Throughput
- Queue Depth
- Database Health
- Redis Health
- HTTP Errors

---

# Alerting

Recommended alerts:

Critical:

- Database Offline
- Redis Offline
- Queue Growth
- Worker Offline
- Failed Deployments

Warning:

- High Latency
- Elevated Retry Count
- Dead-letter Growth
- Slow Queries

Alerts should notify operators before customers are affected.

---

# Secret Management

Production secrets should be stored outside the application.

Possible providers:

```text
Docker Secrets

Kubernetes Secrets

AWS Secrets Manager

Azure Key Vault

HashiCorp Vault
```

Secrets should never be embedded into Docker images.

---

# Release Versioning

Every deployment should expose:

```text
Application Version

Git Commit

Build Timestamp

Environment
```

These values are surfaced through:

```http
GET /version
```

---

# Deployment Verification

Immediately after deployment verify:

- `/health/live`
- `/health/ready`
- `/version`
- `/metrics`
- Queue Status
- Worker Logs

Only after successful verification should the deployment be considered complete.

---

# Rollback Validation

Rollback should verify:

- Services restarted
- Database compatible
- Workers healthy
- Queues processing
- Dashboard operational

Rollback is complete only after operational validation succeeds.

---

# Long-Term Infrastructure Roadmap

Planned improvements include:

- GitHub Actions
- Docker Compose (Development)
- Kubernetes
- Helm Charts
- Horizontal Pod Autoscaler
- Blue/Green Deployments
- Canary Releases
- Multi-region Support
- CDN Integration
- Infrastructure as Code (Terraform)

These enhancements build on the current architecture without requiring application changes.

---

# Deployment Principles

The deployment platform is designed around:

- immutable artifacts
- stateless services
- automated validation
- repeatable releases
- observable deployments
- safe rollback
- horizontal scalability

Infrastructure should remain transparent to the business layer, allowing Flux Tickets to evolve without coupling application logic to deployment technology.

---

# DEPLOYMENT Complete

Together, Parts 1 and 2 define the complete deployment architecture of Flux Tickets, covering build pipelines, containerization, scaling, monitoring, backup strategy, disaster recovery, and the long-term infrastructure roadmap.

---
