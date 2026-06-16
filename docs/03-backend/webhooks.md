# Integrações de Webhooks de Pagamento

## Provedor de Pagamentos
O gateway de pagamento (ex: Mercado Pago, Stripe) envia alertas sobre transações Pix e Cartão de Crédito.
- **Endpoint:** `POST /api/payments/webhook`
- **Lógica de Entrada:**
  1. Validar a assinatura do webhook enviada no header.
  2. Identificar a transação e o ticket associado.
  3. Se o status for aprovado, chamar a aprovação do ingresso no backend (gerando o HMAC hash e mudando status para `VALID`).
  4. Se o pagamento falhar ou for estornado, marcar o ticket como `REVOKED`.
