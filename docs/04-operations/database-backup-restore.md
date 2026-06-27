# Database Backup and Restore

Guidance on backing up and restoring the PostgreSQL database.

## Backup Steps
1. Execute pg_dump script:
   ```bash
   pg_dump -U db_user -h db_host -d flux_ticket > backup.sql
   ```
2. Compress and save to secure storage.

## Restore Steps
1. Prepare a clean database schema.
2. Import database snapshot:
   ```bash
   psql -U db_user -h db_host -d flux_ticket -f backup.sql
   ```
