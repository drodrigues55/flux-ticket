# ADR-004 — Payment Provider Abstraction

Status: Accepted

Date: 2026-06-19

Authors: Flux Tickets Team

---

# Context

Flux Tickets must integrate with one or more payment providers.

The initial production gateway is expected to be Mercado Pago.

Future integrations may include:

- Stripe
- Asaas
- Pagar.me
- PagSeguro
- Other regional providers

Coupling business logic directly to a payment gateway would make provider replacement difficult and spread gateway-specific logic across the application.

---

# Decision

Flux Tickets introduces the **PaymentProvider** interface.

Business services depend only on this abstraction.

Architecture:

```text
PaymentsService

↓

PaymentProvider

↓

Provider Implementation
```

Current implementation:

```text
MockPaymentProvider
```

Future implementations:

```text
MercadoPagoProvider

StripeProvider

AsaasProvider
```

Business services remain unchanged regardless of the provider.

---

# Responsibilities

Every provider implementation must support:

- Payment creation
- Payment lookup
- Webhook parsing
- Status normalization
- Provider-specific validation

Only provider-specific logic belongs inside implementations.

---

# Standardized Statuses

Provider responses are mapped into platform statuses.

Current statuses include:

```text
PENDING

APPROVED

FAILED

REJECTED

EXPIRED
```

Applications never consume provider-specific status values.

---

# Rationale

The abstraction provides:

- Loose coupling
- Easier testing
- Mock provider support
- Gateway replacement
- Cleaner business services
- Simplified maintenance

Business rules remain independent of payment providers.

---

# Alternatives Considered

## Direct Mercado Pago Integration

Pros

- Faster initial implementation

Cons

- Vendor lock-in
- Difficult testing
- Gateway-specific business logic

Rejected.

---

## Separate Payment Microservice

Pros

- Strong isolation

Cons

- Additional infrastructure
- More operational complexity
- Not justified by current platform size

Rejected.

---

## Generic HTTP Client

Pros

- Flexible

Cons

- No business abstraction
- Gateway logic spreads through the application

Rejected.

---

# Consequences

Positive

- Provider independence
- Easier unit testing
- Mock provider support
- Simplified gateway replacement

Negative

- Additional abstraction layer
- Slight increase in implementation effort

These trade-offs are considered beneficial.

---

# Testing

Current validation uses the MockPaymentProvider.

Supported scenarios include:

- Approved payment
- Pending payment
- Rejected payment
- Expired payment
- Temporary provider failure
- Pending recovery

This allows complete testing without requiring production credentials.

---

# Future Considerations

When Mercado Pago is introduced:

- only a new provider implementation should be added;
- PaymentsService should remain unchanged;
- existing tests should continue passing using the mock provider.

Future providers should implement the same interface without affecting business logic.

---

# Related Documents

- 03-backend/payment_engine.md
- 03-backend/webhooks.md
- 03-backend/api_write.md
- 07-testing/testing.md

---
