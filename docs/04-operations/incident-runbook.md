# Incident Runbook

Procedures for diagnosing and resolving common platform issues.

## Stuck Pending Payments
- **Symptom**: User completes checkout but tickets are not issued.
- **Diagnostics**: Check write service logs for `requestId`. Check ifpayment callback webhook was received.
- **Resolution**: Trigger mock provider webhook recovery or manually approve stuck transactions.

## Redis Cache Offline
- **Symptom**: Checkouts fail with 500 error envelopes.
- **Diagnostics**: Ping Redis server on port 6379.
- **Resolution**: Restart Redis service and check memory bounds.
