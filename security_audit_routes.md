# Routes Discovered

- POST /events (rate-limited via global guard/decorator) [services\api-write\src\events\events.controller.ts:14]
- GET /events (rate-limited via global guard/decorator) [services\api-write\src\events\events.controller.ts:36]
- POST /events/:eventId/batches (rate-limited via global guard/decorator) [services\api-write\src\events\events.controller.ts:50]
- GET /events/:eventId/batches (rate-limited via global guard/decorator) [services\api-write\src\events\events.controller.ts:69]
- POST /payments/checkout (rate-limited via global guard/decorator) [services\api-write\src\payments\payments.controller.ts:11]
- POST /payments/webhook (rate-limited via global guard/decorator) [services\api-write\src\payments\payments.controller.ts:22]
- POST /events/:id/staff-mutation (rate-limited via global guard/decorator) [services\api-write\src\tickets\checkout.controller.ts:13]
- POST /tickets/renew-lock (rate-limited via global guard/decorator) [services\api-write\src\tickets\checkout.controller.ts:47]
- POST /tickets/reserve (rate-limited via global guard/decorator) [services\api-write\src\tickets\checkout.controller.ts:70]

## Global Throttling Status
- **services/api-write** (NestJS): Protected globally via ThrottlerGuard
- **services/api-read** (Express): Protected globally via express-rate-limit