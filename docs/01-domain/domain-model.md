# Entidades do Domínio

## User
- **Campos:** id, nome, email, cpf, senha, role (USER, ORGANIZER, STAFF).
- **Regras:** CPF e E-mail devem ser únicos.

## Event
- **Campos:** id, organizerId, title, description, date, location, categoryId.
- **Relacionamentos:** Pertence a um Organizador, possui múltiplos Lotes (TicketBatch).

## Ticket
- **Campos:** id, buyerId, batchId, status (VALID, REVOKED, CONSUMED), price, buyerCpf, signature.
- **Regras:** Cada ticket deve conter assinatura criptográfica gerada por HMAC-SHA256 baseada em seus metadados.

## Order
- **Campos:** id, userId, status (PENDING, PAID, FAILED), total, createdAt.
