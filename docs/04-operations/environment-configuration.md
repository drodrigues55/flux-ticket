# Environment Configuration

Guide to environment variables required to run the platform.

## Database & Cache
- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis URI for job queues and rate limits.

## Security Keys
- `JWT_SECRET`: High entropy key for signing session tokens.
- `HMAC_SECRET`: Key used for signing ticket validator QR codes.

## Service Ports
- `PORT`: (Default: `3002` for read API, `4000` for write API).
- `API_WRITE_URL`: Target path to write API.
- `API_READ_URL`: Target path to read API.
