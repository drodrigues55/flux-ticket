# Bounded Contexts e Domínio (DDD)

## Bounded Contexts
1. **Ticketing:** Reserva, emissão, ciclo de vida e criptografia dos ingressos.
2. **Payments:** Gateway de integração e processamento de pagamentos.
3. **Events:** Criação de eventos, locais de eventos (Venues) e lotes (Batches).
4. **Check-In:** Portaria, sincronização de hashes e fila de acessos offline.
5. **Identity:** Gestão de usuários, credenciais e controle de acessos (RBAC).

## Aggregates
- **Event Aggregate:** Event, Venue, Sector, Batch.
- **Order Aggregate:** Order, Payment.
- **Ticket Aggregate:** Ticket, CheckIn.

## Comandos (Commands)
- `CreateEvent`: Criação do evento e seus lotes associados.
- `ReserveTicket`: Reserva atômica temporária do lote.
- `ConfirmPayment`: Conclusão do processamento financeiro.
- `IssueTicket`: Emissão física do ingresso com assinatura.
- `CheckInTicket`: Registro de passagem na portaria.

## Eventos de Domínio (Domain Events)
- `TicketReserved`: Ingresso travado temporariamente.
- `PaymentApproved`: Transação aceita pelo gateway.
- `TicketIssued`: Ingresso assinado e disponível para download.
- `TicketCheckedIn`: Acesso validado no portão do evento.
