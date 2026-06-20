# ADR-001 — Monorepo Architecture

Status: Accepted

Date: 2026-06-19

Authors: Flux Tickets Team

---

# Context

Flux Tickets consists of multiple applications and services that evolve together while sharing business rules, database schemas, TypeScript types and infrastructure.

Current applications include:

- Consumer Portal
- Organizer Dashboard
- Staff PWA
- api-read
- api-write
- ticket-worker

All applications consume the same domain model and frequently change together during development.

Maintaining them as independent repositories would introduce version synchronization problems, duplicated CI pipelines, duplicated tooling and slower development.

The project also shares:

- Prisma schema
- Shared TypeScript types
- ESLint configuration
- Prettier configuration
- tsconfig
- Build tooling
- CI configuration

These shared resources strongly favor a single repository.

---

# Decision

Flux Tickets adopts a **Monorepo Architecture**.

The repository contains every application, service and shared package required by the platform.

Typical structure:

```text
apps/
    client
    dashboard
    staff-pwa

services/
    api-read
    api-write
    ticket-worker

packages/
    database
    types
    ui
```

Each project remains independently deployable while sharing common packages.

Workspace management is performed using npm Workspaces and Turbo.

---

# Rationale

The monorepo provides:

- Single source of truth
- Shared TypeScript types
- Shared Prisma models
- Atomic commits
- Easier refactoring
- Consistent tooling
- Unified dependency management

Business entities evolve together, making synchronized versioning unnecessary.

---

# Alternatives Considered

## Multiple Repositories

Pros

- Smaller repositories
- Independent release cycles

Cons

- Version synchronization
- Duplicated CI
- Duplicated tooling
- Cross-repository pull requests
- Harder refactoring

Rejected because most components evolve together.

---

## Git Submodules

Pros

- Partial sharing

Cons

- Operational complexity
- Synchronization issues
- Poor developer experience

Rejected.

---

## Polyrepo + Shared Packages

Pros

- Independent deployment

Cons

- Package publishing
- Version drift
- More infrastructure

Rejected due to unnecessary operational overhead.

---

# Consequences

Positive

- Single development environment
- Shared packages
- Easier onboarding
- Faster refactoring
- Atomic business changes
- Simplified dependency management

Negative

- Larger repository
- Larger CI pipeline
- Requires workspace tooling

These disadvantages are considered acceptable.

---

# Future Considerations

The monorepo should continue to separate applications by responsibility while maximizing code reuse through shared packages.

If independent release cycles become necessary, deployment separation should occur at the CI/CD level rather than repository level.

---

# Related Documents

- 02-architecture/architecture.md
- 02-architecture/infrastructure.md
- 03-backend/api_read.md
- 03-backend/api_write.md
- 06-devops/deployment.md

---