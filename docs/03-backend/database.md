# Modelagem do Banco de Dados (Database Schema)

## Objetivo

Definir as principais entidades do Flux Tickets e as necessidades de modelagem para checkout, pagamentos, ingressos, dashboard, auditoria, filas e operação em produção.

O banco relacional é a fonte de verdade do sistema.

Redis deve ser usado para concorrência, cache e locks temporários, mas não como fonte oficial de dados financeiros ou de ingressos.

---

## Tabelas Principais

### `User`

Contém dados de autenticação e identificação.

Campos relevantes:

- `id`
- `name`
- `email`
- `cpf`
- `passwordHash`
- `role`
- `createdAt`
- `updatedAt`

Observação:

CPF e e-mail devem ser validados, mas a unicidade global de CPF precisa considerar casos de comprador, portador e organizador. Evitar regra que bloqueie cenários legítimos sem análise de domínio.

---

### `Organizer`

Representa produtor/organizador.

Campos relevantes:

- `id`
- `userId`
- `document`
- `legalName`
- `tradeName`
- `status`
- `createdAt`
- `updatedAt`

---

### `Event`

Metadados do evento.

Campos relevantes:

- `id`
- `organizerId`
- `categoryId`
- `venueId`
- `name`
- `slug`
- `description`
- `imageUrl`
- `startsAt`
- `endsAt`
- `status`
- `createdAt`
- `updatedAt`

---

### `Venue`

Local do evento.

Campos relevantes:

- `id`
- `name`
- `address`
- `city`
- `state`
- `country`
- `capacity`

---

### `Sector`

Setores do evento.

Campos relevantes:

- `id`
- `eventId`
- `name`
- `capacity`

---

### `TicketBatch`

Lotes vinculados a evento/setor.

Campos relevantes:

- `id`
- `eventId`
- `sectorId`
- `name`
- `price`
- `totalQuantity`
- `availableQuantity`
- `startsAt`
- `endsAt`
- `status`

---

### `Reservation`

Reserva temporária de checkout.

Campos relevantes:

- `id`
- `eventId`
- `buyerId`
- `status`
- `expiresAt`
- `createdAt`
- `updatedAt`

Status:

- `active`
- `expired`
- `converted`
- `cancelled`

---

### `ReservationItem`

Itens reservados.

Campos relevantes:

- `id`
- `reservationId`
- `batchId`
- `quantity`
- `unitPrice`

---

### `Order`

Pedido de compra.

Campos relevantes:

- `id`
- `reservationId`
- `buyerId`
- `status`
- `grossAmount`
- `discountAmount`
- `netAmount`
- `createdAt`
- `updatedAt`

Status:

- `pending`
- `paid`
- `failed`
- `cancelled`
- `refunded`
- `partially_refunded`
- `chargeback`

---

### `Payment`

Pagamento vinculado ao pedido.

Campos relevantes:

- `id`
- `orderId`
- `provider`
- `providerPaymentId`
- `method`
- `status`
- `amount`
- `installments`
- `paidAt`
- `rawPayload`
- `createdAt`

---

### `Ticket`

Ingresso emitido.

Campos relevantes:

- `id`
- `orderId`
- `eventId`
- `batchId`
- `sectorId`
- `holderName`
- `holderCpf`
- `status`
- `qrCodeVersion`
- `hmacSignature`
- `issuedAt`
- `usedAt`
- `cancelledAt`
- `refundedAt`

Status:

- `reserved`
- `issued`
- `used`
- `cancelled`
- `refunded`
- `revoked`

---

### `TicketStatusHistory`

Histórico de mudanças do ingresso.

Campos relevantes:

- `id`
- `ticketId`
- `fromStatus`
- `toStatus`
- `reason`
- `actorId`
- `createdAt`

---

### `Checkin`

Registros de check-in.

Campos relevantes:

- `id`
- `ticketId`
- `eventId`
- `sectorId`
- `deviceId`
- `operatorId`
- `checkedAt`
- `syncStatus`
- `conflictStatus`

---

### `HalfPriceDocument`

Documentos de meia-entrada.

Campos relevantes:

- `id`
- `ticketId`
- `fileUrl`
- `status`
- `reviewedBy`
- `reviewedAt`
- `expiresAt`
- `createdAt`

Status:

- `pending`
- `approved`
- `rejected`
- `expired`

---

### `OutboxEvent`

Tabela para garantir entrega de eventos às filas.

Campos relevantes:

- `id`
- `type`
- `payload`
- `status`
- `attempts`
- `nextRunAt`
- `createdAt`
- `processedAt`

---

## Financeiro

### `Refund`

Campos relevantes:

- `id`
- `orderId`
- `paymentId`
- `amount`
- `reason`
- `status`
- `providerRefundId`
- `createdAt`
- `processedAt`

### `Payout`

Campos relevantes:

- `id`
- `organizerId`
- `eventId`
- `amount`
- `status`
- `scheduledAt`
- `paidAt`

### `Fee`

Campos relevantes:

- `id`
- `orderId`
- `type`
- `amount`

Tipos:

- `gateway`
- `platform`
- `refund`
- `chargeback`

---

## Marketing

### `Coupon`

- `id`
- `eventId`
- `batchId`
- `code`
- `type`
- `value`
- `maxUses`
- `usedCount`
- `startsAt`
- `endsAt`
- `status`

### `SalesChannel`

- `id`
- `name`
- `type`

### `TrackingAttribution`

- `id`
- `orderId`
- `eventId`
- `source`
- `medium`
- `campaign`
- `couponId`
- `promoterId`
- `createdAt`

---

## Dashboard e Analytics

Para o dashboard inteligente, o banco deve armazenar ou permitir calcular:

- Receita por evento.
- Receita por lote.
- Receita por canal.
- Ingressos vendidos.
- Ocupação.
- Ticket médio.
- Conversão.
- Próximo repasse.
- Lotes próximos de esgotar.
- Score de prioridade.
- Alertas operacionais.
- Check-ins.
- Público esperado.

### `DashboardEventMetric`

Tabela agregada opcional.

Campos:

- `id`
- `eventId`
- `period`
- `grossRevenue`
- `netRevenue`
- `ticketsSold`
- `averageTicket`
- `occupancyRate`
- `conversionRate`
- `checkinsCount`
- `priorityScore`
- `priorityLevel`
- `updatedAt`

### `DashboardAlert`

Campos:

- `id`
- `eventId`
- `type`
- `severity`
- `message`
- `suggestedAction`
- `status`
- `createdAt`
- `resolvedAt`

---

## Auditoria

### `AuditLog`

Registra ações sensíveis.

Campos:

- `id`
- `actorId`
- `action`
- `entityType`
- `entityId`
- `before`
- `after`
- `reason`
- `ipAddress`
- `userAgent`
- `requestId`
- `createdAt`

Ações auditáveis:

- Criar/alterar evento.
- Criar/alterar lote.
- Pausar vendas.
- Cancelar ingresso.
- Reembolsar pedido.
- Reenviar ingresso.
- Alterar status manualmente.
- Reprocessar job.
- Alterar permissões.

---

## Índices Recomendados

### Usuários

- `User.email`
- `User.cpf`

### Eventos

- `Event.slug`
- `Event.organizerId`
- `Event.startsAt`
- `Event.status`

### Lotes

- `TicketBatch.eventId`
- `TicketBatch.sectorId`
- `TicketBatch.status`

### Tickets

- `Ticket.eventId`
- `Ticket.orderId`
- `Ticket.holderCpf`
- `Ticket.status`
- Índice composto: `Ticket(eventId, status)`
- Índice composto: `Ticket(batchId, status)`

### Pedidos e pagamentos

- `Order.buyerId`
- `Order.status`
- `Payment.providerPaymentId`
- `Payment.status`
- Índice composto: `Order(status, createdAt)`

### Dashboard

- `DashboardEventMetric(eventId, period)`
- `DashboardEventMetric(priorityScore)`
- `DashboardAlert(eventId, status, severity)`

### Auditoria

- `AuditLog(actorId)`
- `AuditLog(entityType, entityId)`
- `AuditLog(requestId)`

---

## Regras Importantes

- O frontend não deve depender de dados mockados.
- Métricas do dashboard devem vir do banco ou de agregações backend.
- Dados financeiros devem ser persistidos.
- Webhooks devem salvar payload bruto.
- QR Codes devem ter versionamento.
- Check-ins offline devem ser sincronizáveis e auditáveis.
- Toda mudança manual sensível deve gerar auditoria.
