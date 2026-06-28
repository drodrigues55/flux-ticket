# Ticket Delivery Testing Procedures

This document outlines quality assurance strategies and verification tests for validating print and email ticket delivery channels.

## 1. Printable Page Verifications
To verify the printable view `/ticket/[ticketId]/pdf`:
- **Valid Ticket Test**: Ensure standard layout, QR Code, and print dialog trigger automatically.
- **Revoked Ticket Test**: Accessing with a revoked ticket UUID must display "Ingresso Inválido para Impressão" and suppress print actions.

## 2. Worker & Provider Tests
- Run NestJS tests inside `services/ticket-worker`:
  ```bash
  npm test -w services/ticket-worker
  ```
- Tests cover email formatting, provider API error status mapping, and idempotency checks.
