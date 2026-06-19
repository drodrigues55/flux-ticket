# Filas de Processamento (Queues - BullMQ)

## Objetivo

As filas do Flux Tickets devem processar tarefas assíncronas de forma segura, rastreável e reprocessável.

Nenhuma fila crítica deve depender de execução única sem retry ou sem persistência.

---

## Princípios

- Jobs devem ser idempotentes.
- Jobs devem ter retries com backoff.
- Falhas devem ir para dead-letter queue.
- Jobs críticos devem possuir logs com `jobId` e `requestId`.
- Filas devem ser monitoradas pelo BullMQ Board.
- Reprocessamentos manuais devem ser auditados.
- Jobs não devem carregar dados sensíveis desnecessários.
- Preferir IDs e buscar dados atualizados no banco.

---

## Filas Operacionais

### `halfPrice.validateDeadline`

Valida prazo de envio de documento de meia-entrada.

Executa de hora em hora.

Responsabilidades:

- Verificar tickets de meia-entrada sem documento.
- Validar SLA de 24h.
- Revogar ticket quando aplicável.
- Enfileirar reembolso, se necessário.
- Registrar auditoria.

---

### `wallet.generate`

Gera arquivos de carteira digital.

Responsabilidades:

- Gerar Apple Wallet `.pkpass`.
- Gerar Google Wallet object.
- Assinar arquivos.
- Salvar referência no banco/storage.
- Atualizar status do ticket.
- Permitir retry.

Observação:

Apple Wallet depende de conta Apple Developer e certificados.
Google Wallet depende de issuer aprovado e credenciais.

---

### `tickets.email`

Envia ingressos por e-mail.

Responsabilidades:

- Enviar confirmação de compra.
- Enviar PDF.
- Enviar links de Wallet.
- Reenviar manualmente pelo suporte.
- Registrar entrega ou falha.

Provider sugerido:

- Resend
- SendGrid
- AWS SES

---

### `checkins.sync`

Processa check-ins coletados offline pela Staff PWA.

Responsabilidades:

- Receber lote de check-ins.
- Validar assinatura HMAC.
- Detectar duplicidade.
- Detectar conflitos.
- Atualizar status do ingresso.
- Registrar dispositivo e operador.
- Gerar alerta quando houver conflito.

---

### `payments.webhook`

Processa webhooks do gateway.

Responsabilidades:

- Validar assinatura.
- Persistir payload bruto.
- Garantir idempotência.
- Atualizar status do pedido.
- Disparar emissão de ingresso.
- Disparar e-mail.
- Disparar conciliação quando necessário.

---

### `tickets.issue`

Emite ingressos após pagamento aprovado.

Responsabilidades:

- Criar ou confirmar tickets.
- Gerar assinatura HMAC.
- Gerar QR Code.
- Atualizar status.
- Enfileirar e-mail.
- Enfileirar Wallet, se solicitado.

---

### `refunds.process`

Processa reembolsos.

Responsabilidades:

- Solicitar reembolso no gateway.
- Atualizar status financeiro.
- Cancelar ou revogar ingresso.
- Registrar auditoria.
- Enviar notificação.

---

### `analytics.aggregate`

Agrega dados para dashboard.

Responsabilidades:

- Atualizar KPIs por evento.
- Atualizar lotes.
- Atualizar canais de venda.
- Atualizar score de prioridade.
- Atualizar alertas operacionais.
- Evitar cálculo pesado no frontend.

---

## Estados de Job

Estados esperados:

- `waiting`
- `active`
- `completed`
- `failed`
- `delayed`
- `dead-lettered`

Jobs falhos devem manter:

- Motivo da falha.
- Stack trace.
- Payload sanitizado.
- Quantidade de tentativas.
- Data da próxima tentativa.
- `requestId`, quando existir.

---

## Retry

Padrão recomendado:

```ts
{
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 5000
  },
  removeOnComplete: 1000,
  removeOnFail: false
}
```

A quantidade de tentativas pode variar por fila.

Pagamentos, e-mails e wallet devem tolerar retries.

---

## Dead-Letter Queue

Jobs que falham após todas as tentativas devem ir para uma fila de análise.

Exemplos:

- `payments.webhook.dead`
- `tickets.email.dead`
- `wallet.generate.dead`
- `checkins.sync.dead`

Reprocessamento manual deve:

- Exigir permissão.
- Registrar usuário.
- Registrar motivo.
- Registrar horário.

---

## BullMQ Board

BullMQ Board deve ser instalado para operação.

Funções:

- Ver jobs ativos.
- Ver jobs falhos.
- Reprocessar jobs.
- Remover jobs inválidos.
- Monitorar fila travada.

Regras de segurança:

- Não expor publicamente.
- Proteger por autenticação.
- Usar apenas em staging/production com acesso restrito.

---

## Métricas

Cada fila deve expor:

- Jobs pendentes.
- Jobs ativos.
- Jobs concluídos.
- Jobs falhos.
- Tempo médio de processamento.
- Taxa de retry.
- Jobs mortos.
- Jobs por tipo.

---

## Checklist

- [ ] Todas as filas críticas definidas.
- [ ] Jobs idempotentes.
- [ ] Retries configurados.
- [ ] Dead-letter queues.
- [ ] BullMQ Board.
- [ ] Logs com jobId.
- [ ] Alertas de filas travadas.
- [ ] Reprocessamento manual auditado.
