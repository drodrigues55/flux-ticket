# Filas de Processamento (Queues - BullMQ)

## Filas Operacionais
1. **ValidateHalfPriceDeadline:** Job executado de hora em hora para verificar se a SLA de 24h para envio do documento de meia-entrada estourou. Se sim, revoga o ticket e estorna o cliente.
2. **GenerateWalletPass:** Geração assíncrona do arquivo de Wallet (`.pkpass`) para Apple e Google Pay.
3. **SendTicketEmail:** Fila de envio de e-mails com arquivos PDF anexos.
4. **SyncOfflineCheckins:** Processa a fila de check-ins coletados offline pelas portarias.
