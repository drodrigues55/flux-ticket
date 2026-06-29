# Reporting QA Verification

This document contains testing routines for reporting aggregates and CSV columns.

## 1. Automated Verification
Run the dashboard unit tests to check query building filters and URL formats:
```bash
npm test -w apps/dashboard
```

## 2. Manual Export Verification
1. Access the organizer dashboard and navigate to the "Finance" center page: `/finance`.
2. Verify that gross, net, and tickets sold counts match existing seed sales logs.
3. Download the Payment Ledger CSV and check that:
   - Sensitive CPF and card tokens are excluded.
   - Column values are accurate.
