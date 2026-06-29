# Ticket Delivery Architecture

Flux Tickets manages ticket delivery via multiple channels: web access, printable PDF rendering, and transactional emails.

## 1. Printable PDF rendering
To keep resource footprint low, we utilize a printable HTML route (`/ticket/:ticketId/pdf`) rather than server-side headless browser generation (e.g. Puppeteer). 
- When the page loads, `window.print()` is triggered automatically.
- Media print queries hide unnecessary web controls (the "no-print" sections) and format the page size for standard print output/PDF saving.

## 2. Security & Status Checks
- Access to print coordinates is restricted via UUID lookups.
- Only tickets with valid statuses (`VALID`, `PENDING_VALIDATION`, `CONSUMED`) are allowed to print or render QRs.
- Unpaid, cancelled, or revoked tickets show an "Invalid Ticket for Printing" block and suppress automated print dialogs.

> [!WARNING]
> Under no circumstances should order confirmation views (`/orders/[orderId]/confirmation`) expose direct ticket link bindings or QR code generators unless the associated order status is verified server-side as `PAID`. 

> [!IMPORTANT]
> Non-actionable ticket states (like `REVOKED` or `PENDING_PAYMENT`) must fail verification at edge portals and block UI-side download and printable views immediately.

## 3. Email Delivery
- Triggered by outbox events on `ORDER_PAID`.
- Safe retry and idempotency are tracked using `AuditLog` records.
