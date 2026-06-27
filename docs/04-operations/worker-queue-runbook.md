# Worker Queue Runbook

Guide to managing async BullMQ workers for ticketing and deliveries.

## Queues List
- `tickets.delivery`: Processing ticket PDF uploads and mock emails.
- `tickets.issue`: Async creation of valid ticket records in database.

## Dead Letter Jobs
- Verify failed jobs in Redis.
- Inspect the stack trace inside the job payload to determine if failures are network-related or code-related.
- Resubmit using the queue dashboard proxy if appropriate.
