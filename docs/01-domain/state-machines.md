# Máquinas de Estados e Ciclos de Vida

## Ciclo de Vida do Ingresso (Ticket)
```text
[RESERVED] ──(Pagamento Aprovado)──> [VALID] ──(Scan Portaria)──> [CONSUMED]
    │                                   │
(Expirou 3 min)                  (Reembolso / Cancelamento)
    ▼                                   ▼
[EXPIRED]                           [REVOKED]
```

## Ciclo de Vida do Pedido (Order)
- **CREATED:** Pedido gerado e itens reservados.
- **PROCESSING:** Transação enviada ao gateway.
- **PAID:** Pagamento compensado.
- **FAILED:** Pagamento recusado ou tempo de checkout esgotado.
- **REFUNDED:** Compra devolvida.

## Ciclo de Vida do Evento
- **DRAFT:** Criação em andamento pelo organizador.
- **PUBLISHED:** Disponível para visualização.
- **ACTIVE:** Com ingressos à venda.
- **ENDED:** Data do evento ultrapassada.
