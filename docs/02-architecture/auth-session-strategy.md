# Auth and Session Strategy

Flux Tickets uses a secure JWT-based stateless authentication flow for APIs, coupled with role-based checks for organizer and gate staff actions.

## 1. Token Lifetimes & Persistence
In production settings, tokens are designed with:
- **Access Tokens**: Short-lived (e.g. 15 minutes) sent in Authorization Bearer headers.
- **Refresh Tokens**: Longer-lived (e.g. 7 days).
- **Current Limitation**: The dashboard currently implements a mock-based session persistence proxy model (`organizer-mock`) that authenticates organizer actions directly. Full database refresh token rotation is planned for post-MVP.

> [!WARNING]
> Secrets like `JWT_SECRET` must be set to a cryptographically secure random string in production settings. Production runtimes must reject insecure fallback secrets.

## 2. Organization RBAC Boundaries
- Access controls are enforced server-side.
- Controller operations check database memberships and roles (`OWNER`, `ADMIN`, `MEMBER`, etc.).
- Members with disabled/suspended organization membership status are rejected with `ForbiddenException` immediately.

> [!IMPORTANT]
> User status checks are evaluated dynamically on every write action to prevent revoked members from executing operations via active cached tokens. UI layouts must mirror these restrictions to maintain consistent user feedback.
