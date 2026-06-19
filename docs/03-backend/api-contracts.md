# Contratos de APIs (API Contracts)

## Objetivo

Definir contratos de API do Flux Tickets com foco em previsibilidade, consistência, segurança, idempotência e suporte a dashboard data-driven.

Todas as APIs devem retornar erros padronizados e incluir `requestId`.

---

## Padrão Global

### Headers

```http
x-request-id: req_...
authorization: Bearer <token>
content-type: application/json
```

### Resposta de Sucesso

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

### Resposta de Erro

```json
{
  "error": {
    "code": "TICKET_BATCH_SOLD_OUT",
    "message": "Este lote está esgotado.",
    "statusCode": 422,
    "requestId": "req_123",
    "details": {}
  }
}
```

### Códigos de Erro

| Status | Uso |
|---:|---|
| 400 | Payload inválido ou mal formatado |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito de estado |
| 422 | Regra de negócio inválida |
| 429 | Rate limit |
| 500 | Erro interno |

---

## APIs Públicas (`apps/client`)

### Reservar ingressos

`POST /api/tickets/reserve`

Reserva cotas temporariamente no Redis.

Request:

```json
{
  "eventId": "evt_123",
  "items": [
    {
      "batchId": "batch_123",
      "quantity": 2
    }
  ]
}
```

Response:

```json
{
  "data": {
    "reservationId": "res_123",
    "expiresAt": "2026-06-18T20:15:00.000Z",
    "items": [
      {
        "batchId": "batch_123",
        "quantity": 2,
        "unitPrice": 120
      }
    ]
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Erros relevantes:

- `TICKET_BATCH_SOLD_OUT`
- `RESERVATION_LIMIT_EXCEEDED`
- `EVENT_NOT_AVAILABLE`
- `RATE_LIMITED`

---

### Renovar lock

`POST /api/tickets/renew-lock`

Request:

```json
{
  "reservationId": "res_123"
}
```

Response:

```json
{
  "data": {
    "reservationId": "res_123",
    "expiresAt": "2026-06-18T20:20:00.000Z"
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

### Checkout

`POST /api/payments/checkout`

Cria pagamento a partir de uma reserva válida.

Request:

```json
{
  "reservationId": "res_123",
  "buyer": {
    "name": "Nome do comprador",
    "email": "cliente@email.com",
    "cpf": "00000000000"
  },
  "holders": [
    {
      "name": "Nome do portador",
      "cpf": "00000000000",
      "isHalfPrice": false
    }
  ],
  "paymentMethod": {
    "type": "credit_card",
    "installments": 1,
    "token": "gateway_token"
  }
}
```

Response:

```json
{
  "data": {
    "orderId": "ord_123",
    "paymentId": "pay_123",
    "status": "pending",
    "paymentUrl": null
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## Webhooks

### Mercado Pago

`POST /api/webhooks/mercado-pago`

Regras:

- Validar assinatura.
- Persistir payload bruto.
- Processar com idempotência.
- Retornar `200` rapidamente.
- Enfileirar processamento pesado.

Response:

```json
{
  "data": {
    "received": true
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## APIs do Consumidor

### Meus ingressos

`GET /api/me/tickets`

Response:

```json
{
  "data": [
    {
      "ticketId": "ticket_123",
      "eventName": "Festival Flux",
      "status": "issued",
      "qrCodeUrl": "/api/me/tickets/ticket_123/qr",
      "walletAvailable": true
    }
  ],
  "meta": {
    "requestId": "req_123"
  }
}
```

### Upload de meia-entrada

`POST /api/me/tickets/:ticketId/half-price-document`

Deve aceitar upload multipart ou URL assinada para storage.

---

## APIs de Dashboard (`apps/dashboard`)

### CRUD Eventos

- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`

### Gestão de lotes

- `GET /api/events/:id/batches`
- `POST /api/events/:id/batches`
- `PATCH /api/events/:id/batches/:batchId`
- `DELETE /api/events/:id/batches/:batchId`

---

## APIs da Dashboard Inteligente

Todas as respostas devem vir do backend já agregadas e prontas para renderização.

O frontend não deve calcular métricas críticas a partir de listas brutas.

### Resumo global

`GET /api/dashboard/overview?period=7d`

Response:

```json
{
  "data": {
    "grossRevenue": 154890,
    "ticketsSold": 1280,
    "averageTicket": 121,
    "conversionRate": 8.4,
    "upcomingPayout": {
      "amount": 45200,
      "date": "2026-06-25"
    }
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

### Evento prioritário

`GET /api/dashboard/priority-event`

Response:

```json
{
  "data": {
    "eventId": "evt_123",
    "name": "Festival Flux",
    "imageUrl": "https://...",
    "date": "2026-07-10",
    "venue": "Arena Central",
    "priorityScore": 92,
    "priorityLevel": "critical",
    "revenue": 184000,
    "ticketsSold": 1530,
    "occupancyRate": 84,
    "daysRemaining": 5,
    "nextPayout": {
      "amount": 58000,
      "date": "2026-06-25"
    },
    "mainAlert": {
      "type": "LOT_NEAR_SOLD_OUT",
      "severity": "warning",
      "message": "Lote VIP com 92% de ocupação."
    }
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

### Eventos por prioridade

`GET /api/dashboard/events-priority`

Response:

```json
{
  "data": {
    "critical": [],
    "attention": [],
    "healthy": []
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

### Performance de lotes

`GET /api/dashboard/events/:eventId/lots-performance`

Response:

```json
{
  "data": [
    {
      "batchId": "batch_123",
      "name": "VIP",
      "capacity": 500,
      "sold": 460,
      "remaining": 40,
      "occupancyRate": 92,
      "revenue": 92000,
      "alertLevel": "warning"
    }
  ],
  "meta": {
    "requestId": "req_123"
  }
}
```

---

### Alertas operacionais

`GET /api/dashboard/alerts`

Response:

```json
{
  "data": [
    {
      "alertId": "alert_123",
      "type": "LOT_NEAR_SOLD_OUT",
      "severity": "warning",
      "eventId": "evt_123",
      "eventName": "Festival Flux",
      "message": "Lote VIP está com 92% de ocupação.",
      "suggestedAction": "Avaliar abertura de novo lote."
    }
  ],
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## APIs Staff PWA

### Baixar dados do evento para validação offline

`GET /api/staff/events/:eventId/offline-bundle`

Response:

```json
{
  "data": {
    "eventId": "evt_123",
    "generatedAt": "2026-06-18T20:00:00.000Z",
    "tickets": [
      {
        "ticketId": "ticket_123",
        "sectorId": "sector_1",
        "status": "issued",
        "signature": "hmac_signature"
      }
    ]
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

### Sincronizar check-ins offline

`POST /api/staff/checkins/sync`

Request:

```json
{
  "deviceId": "device_123",
  "eventId": "evt_123",
  "checkins": [
    {
      "ticketId": "ticket_123",
      "checkedAt": "2026-06-18T21:00:00.000Z",
      "signature": "hmac_signature"
    }
  ]
}
```

---

## Auditoria

Ações sensíveis devem gerar eventos de auditoria:

- Criar evento.
- Alterar lote.
- Pausar vendas.
- Cancelar ingresso.
- Reembolsar pedido.
- Reenviar ingresso.
- Reprocessar job.
- Alterar status manualmente.

---

## Checklist

- [ ] Todas as APIs retornam `requestId`.
- [ ] Erros padronizados.
- [ ] Webhooks idempotentes.
- [ ] APIs de dashboard agregadas.
- [ ] Contratos de widgets definidos.
- [ ] Staff PWA com contratos offline.
- [ ] Auditoria em ações sensíveis.
