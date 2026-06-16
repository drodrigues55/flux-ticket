# Event Storming - Fluxo de Eventos

## Eventos Cronológicos Operacionais
1. **Comando:** Criar Evento → **Evento:** `EventCreated`
2. **Comando:** Publicar Evento → **Evento:** `EventPublished`
3. **Comando:** Selecionar Ingressos → **Evento:** `TicketSelected`
4. **Comando:** Travar Ingressos no Redis → **Evento:** `TicketReserved`
5. **Comando:** Confirmar Checkout → **Evento:** `OrderCreated`
6. **Comando:** Capturar Pagamento → **Evento:** `PaymentApproved`
7. **Comando:** Assinar Ingresso → **Evento:** `TicketIssued`
8. **Comando:** Scan QR Code → **Evento:** `TicketValidated` / `TicketCheckedIn`
