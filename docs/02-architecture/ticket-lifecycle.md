# Ciclo de Vida do Ingresso (Ticket Lifecycle)

## Estados do Ingresso
1. **PENDING_VALIDATION:** Ingresso reservado, porém aguardando análise de documentos de meia-entrada (SLA de 24h).
2. **VALID:** Ingresso pago e ativo. Pronto para check-in.
3. **REVOKED:** Cancelado pelo organizador ou reembolsado.
4. **CONSUMED:** Escaneado com sucesso e validado na portaria.

## Lógica de Criação e Liberação
No momento da compra, os ingressos são gerados como `PENDING_VALIDATION` ou `VALID`. Se houver contestação de pagamento (Chargeback) ou cancelamento pelo usuário, o status é alterado para `REVOKED` e o estoque correspondente é reabastecido no banco de dados relacional.
