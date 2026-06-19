# Observabilidade e Monitoramento

## Objetivo

A observabilidade do Flux Tickets deve permitir detectar, investigar e corrigir problemas antes que afetem consumidores, organizadores ou portarias.

O sistema deve responder rapidamente:

- O checkout está funcionando?
- O gateway está confirmando pagamentos?
- Os webhooks estão chegando?
- As filas estão processando?
- O Redis está consistente?
- O banco está saudável?
- A portaria está sincronizando?
- O dashboard está mostrando dados atualizados?

---

## Stack Recomendada

| Ferramenta | Função | Prioridade |
|---|---|---:|
| Sentry | Captura de erros frontend/backend | Alta |
| Pino | Logs estruturados em JSON | Alta |
| BullMQ Board | Monitoramento de filas | Alta |
| Uptime Kuma | Monitoramento de disponibilidade | Alta |
| Prometheus | Coleta de métricas | Média |
| Grafana | Dashboards técnicos | Média |
| Loki | Centralização de logs | Média |
| Tempo/OpenTelemetry | Tracing distribuído | Evolução |
| Alertmanager | Alertas automáticos | Evolução |

---

## Logs

O backend deve usar logs estruturados em JSON.

Biblioteca recomendada:

- `pino`

Todo log relevante deve conter:

- `requestId`
- `userId`, quando houver
- `organizerId`, quando houver
- `eventId`, quando houver
- `ticketId`, quando houver
- `orderId`, quando houver
- `jobId`, quando houver
- `environment`
- `service`
- `level`
- `message`
- `timestamp`

### Não logar

- Número completo de cartão.
- CVV.
- Tokens de gateway.
- Secrets.
- Senhas.
- Documento de meia-entrada em texto bruto.
- HMAC secret.
- JWT completo.

### Exemplo de log

```json
{
  "level": "info",
  "service": "api-write",
  "requestId": "req_123",
  "eventId": "evt_123",
  "orderId": "ord_456",
  "message": "Payment webhook processed",
  "timestamp": "2026-06-18T20:00:00.000Z"
}
```

---

## Request ID

Toda request deve receber um `requestId`.

Regras:

- Se o cliente enviar `x-request-id`, reutilizar.
- Se não enviar, gerar.
- Retornar o ID em todas as respostas.
- Propagar para logs, jobs, webhooks e erros.
- Incluir em mensagens de erro para suporte.

Header:

```http
x-request-id: req_...
```

---

## Sentry

O Sentry deve capturar erros de:

- `apps/client`
- `apps/dashboard`
- `apps/staff-pwa`
- `services/api-write`
- `services/api-read`
- workers BullMQ

Configurar:

```env
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_RELEASE=
```

Enviar contexto:

- Usuário.
- Ambiente.
- Rota.
- Serviço.
- Request ID.
- Event ID.
- Order ID.
- Job ID.

Prioridade MVP:

- [ ] Sentry no frontend.
- [ ] Sentry no backend.
- [ ] Sentry nos workers.
- [ ] Source maps no frontend.
- [ ] Release tracking.

---

## Métricas Prometheus

Prometheus deve coletar métricas técnicas e de negócio operacional.

### API

- Latência HTTP.
- Requests por rota.
- Taxa de erro por rota.
- Status codes.
- Tempo médio de checkout.
- Tempo médio de reserva.
- Tempo médio de confirmação de pagamento.

### Redis

- Hit ratio.
- Uso de memória.
- Número de chaves.
- Locks ativos.
- Reservas ativas.
- Expirações de reserva.

### PostgreSQL

- Conexões ativas.
- Latência de query.
- Queries lentas.
- Deadlocks.
- Tamanho do banco.

### BullMQ

- Jobs ativos.
- Jobs aguardando.
- Jobs falhos.
- Jobs concluídos.
- Tempo médio por fila.
- Retries.
- Dead-letter jobs.

### Negócio

- Pedidos criados.
- Pagamentos aprovados.
- Pagamentos falhos.
- Webhooks recebidos.
- Tickets emitidos.
- Check-ins sincronizados.
- Reembolsos pendentes.
- Eventos com alerta.

---

## Grafana

Grafana deve exibir dashboards técnicos.

Dashboards recomendados:

1. Visão geral da plataforma.
2. Checkout.
3. Pagamentos e webhooks.
4. Redis e estoque.
5. PostgreSQL.
6. BullMQ.
7. Staff PWA e sync offline.
8. Erros e latência.
9. Dashboard financeiro operacional.

Cada dashboard deve conter:

- Saúde atual.
- Últimas 24h.
- Alertas ativos.
- Métricas por serviço.
- Métricas por ambiente.

---

## Loki

Loki deve centralizar logs.

Consultas úteis:

- Por `requestId`.
- Por `orderId`.
- Por `ticketId`.
- Por `eventId`.
- Por `jobId`.
- Por serviço.
- Por erro.
- Por webhook.
- Por gateway.

Exemplos de buscas:

```text
{service="api-write"} |= "Payment webhook processed"
{service="worker"} |= "wallet.generate"
{level="error"} |= "checkout"
```

---

## Tracing

Tracing distribuído é recomendado para evolução.

Fluxos prioritários:

- Reserva de ingresso.
- Checkout.
- Webhook de pagamento.
- Emissão de ingresso.
- Geração de Wallet.
- Envio de e-mail.
- Sync de check-in offline.

Objetivo:

Identificar onde uma operação ficou lenta ou falhou.

---

## Uptime Kuma

Monitorar disponibilidade externa de:

- Portal do consumidor.
- Dashboard do organizador.
- API Read.
- API Write.
- Webhook endpoint.
- Staff PWA.
- Página de status, se existir.

Alertas:

- WhatsApp/Telegram/Discord/E-mail, conforme definido.
- Incidente se queda durar mais de 1 minuto em produção.
- Aviso se latência passar do limite.

---

## BullMQ Board

BullMQ Board deve ser usado para monitorar filas.

Regras:

- Nunca expor publicamente sem autenticação.
- Proteger por VPN, basic auth ou painel interno.
- Permitir reprocessamento manual apenas para usuários autorizados.
- Registrar ações administrativas.

Filas críticas:

- `payments.webhook`
- `tickets.issue`
- `tickets.email`
- `wallet.generate`
- `halfPrice.validate`
- `checkins.sync`
- `refunds.process`
- `analytics.aggregate`

---

## Alertas

Alertas mínimos para MVP:

- API indisponível.
- Webhook falhando.
- Fila com jobs falhos.
- Fila travada.
- Redis indisponível.
- Banco indisponível.
- Pagamento aprovado sem ingresso.
- Ingresso emitido sem pagamento confirmado.
- Staff PWA sem sync por tempo excessivo.
- Erro frontend recorrente no checkout.

---

## Severidade

| Severidade | Critério |
|---|---|
| SEV1 | Checkout, pagamento, banco ou emissão de ingressos indisponível |
| SEV2 | Webhook, filas, Redis ou check-in com falhas relevantes |
| SEV3 | Dashboard, relatórios ou métricas inconsistentes |
| SEV4 | Bugs visuais ou erros sem impacto operacional |

---

## Checklist MVP

- [ ] Pino configurado.
- [ ] Request ID em todas as APIs.
- [ ] Sentry frontend/backend.
- [ ] Sentry nos workers.
- [ ] BullMQ Board.
- [ ] Uptime Kuma.
- [ ] Logs sem dados sensíveis.
- [ ] Alertas de webhook.
- [ ] Alertas de filas.
- [ ] Healthcheck por serviço.
