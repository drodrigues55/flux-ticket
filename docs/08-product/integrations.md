# Integrations

> Status: Active
> Last Updated: June 2026

---

# Overview

This document covers the external systems and internal platform integrations that the product depends on.

The list below is constrained to what the current codebase and roadmap already imply.

---

# Current Integrations

## PostgreSQL

Primary source of truth for tickets, payments, events, batches, reservations, check-ins, history, audit, and analytics reads.

## Redis

Used for:

- reservation locks
- checkout throttling
- queue coordination
- worker-backed asynchronous processing

## BullMQ

Used to process:

- payment webhooks
- pending payment recovery
- ticket issuance
- waitlist invitations
- abandoned cart expiration
- analytics aggregation

## Next.js API Proxy

The dashboard uses Next API routes as the browser-facing entrypoint for protected backend reads.

## Payment Provider

The codebase already models a provider abstraction and payment recovery flow.

The exact gateway contract should stay implementation-aligned and not be generalized beyond the supported provider path.

## Wallet and Ticket Delivery

The roadmap and product surface include:

- PDF ticket output
- Apple Wallet
- Google Wallet

These should be documented as delivery/integration channels, not as invented product capabilities.

---

# External Dependencies

Documented external dependencies currently include:

- Redis
- PostgreSQL
- payment provider credentials and webhooks
- wallet issuer credentials where wallet support is enabled

These are operational dependencies, not UI features.

