# Exporting Financial Reports

This operations guide explains how to export financial and ticket reports from the organizer dashboard.

## 1. Export Types
- **Payment Ledger CSV**: Lists transaction statuses, amounts, estimated fees, and dates. Access: `/finance/exports`.
- **Event Financial Summary CSV**: Contains ticket type sales and batch-level revenue aggregates. Access: `/finance/events/[eventId]`.

## 2. Security Controls
- **Organization Isolation**: Every export validates membership role permissions. Cross-organization downloads are strictly blocked.
- **Privacy Controls**: Sensitive customer details (such as CPF or payment card keys) are completely omitted from the CSV columns.
