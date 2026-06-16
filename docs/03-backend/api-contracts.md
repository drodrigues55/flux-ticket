# Contratos de APIs (API Contracts)

## APIs Públicas (apps/client)
- `POST /api/tickets/reserve`: Reserva cotas de ingressos temporariamente no Redis (suporta múltiplos lotes).
  - *Request Body:* `{ eventId: string, items: Array<{ batchId: string, price: number, quantity: number }> }`
  - *Response:* `{ ticketId: "t1,t2", userId: "guest-id" }`
- `POST /api/tickets/renew-lock`: Estende o lock temporário de ingressos em andamento no Redis (busca lotes no DB).
  - *Request Body:* `{ userId: string, ticketId: string }`
- `POST /api/payments/checkout`: Processa o formulário de pagamento e finaliza os ingressos reservados.
  - *Request Body:* `{ ticketId: string, buyerName: string, email: string, buyerCpf: string, paymentMethod: object, holders: array }`

## APIs de Dashboard (apps/dashboard)
- `POST /api/events`: CRUD de eventos.
- `POST /api/events/[id]/batches`: Gestão de lotes.
- `GET /api/events/[id]/reports`: Exportação de relatórios de faturamento.
