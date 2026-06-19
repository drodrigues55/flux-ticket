# Recuperação de Desastres (Disaster Recovery)

## Objetivo

Definir como o Flux Tickets deve se recuperar de falhas críticas sem perda relevante de dados, especialmente em fluxos sensíveis como checkout, pagamentos, emissão de ingressos, filas, Redis e validação de portaria.

O sistema deve assumir que falhas vão acontecer e deve ser capaz de:

- Detectar indisponibilidade rapidamente.
- Preservar pedidos, reservas, pagamentos e ingressos.
- Restaurar banco de dados e Redis.
- Reprocessar eventos pendentes.
- Manter check-in operacional mesmo com instabilidade de rede.
- Evitar inconsistência entre gateway de pagamento, banco e filas.

---

## Componentes Críticos

| Componente | Impacto se falhar | Estratégia |
|---|---:|---|
| PostgreSQL | Crítico | Backup, PITR, replicação e restore testado |
| Redis | Alto | Self-healing a partir do banco, TTLs e reconstrução de estoque |
| BullMQ | Alto | Retry, dead-letter queues e reprocessamento manual |
| Gateway de Pagamento | Crítico | Webhooks idempotentes e conciliação financeira |
| API Write | Crítico | Healthcheck, autoscaling e rollback |
| API Read | Médio | Cache, fallback e degradação controlada |
| Staff PWA | Crítico no evento | Offline-first, IndexedDB e sync posterior |
| Object Storage | Alto | Backup de documentos, ingressos PDF e assets |
| E-mail/Notificações | Médio | Retry e reenvio manual pelo suporte |

---

## Backups

### Banco de Dados

- [ ] Backups automáticos de hora em hora.
- [ ] Backup diário completo.
- [ ] Point-in-Time Recovery (PITR), quando disponível.
- [ ] Retenção mínima de 7 dias para MVP.
- [ ] Retenção recomendada de 30 dias para produção.
- [ ] Teste de restauração pelo menos 1 vez por mês.
- [ ] Backup antes de migrations críticas.
- [ ] Backup separado para staging e produção.

### Arquivos e Assets

Devem ser armazenados em serviço externo compatível com S3 ou equivalente:

- Documentos de meia-entrada.
- Assets de eventos.
- PDFs de ingressos.
- Arquivos Wallet.
- Exportações financeiras.

Regras:

- [ ] Versionamento de objetos quando possível.
- [ ] Política de expiração para arquivos temporários.
- [ ] Separação por ambiente: development, staging e production.
- [ ] Controle de acesso privado por padrão.

---

## Recuperação do Redis

O Redis pode ser reconstruído a partir do banco relacional.

A reconstrução deve considerar:

- `TicketBatch.totalQuantity`
- `TicketBatch.availableQuantity`
- Tickets com status reservado.
- Tickets com status pago.
- Tickets expirados.
- Locks ativos ainda válidos.
- Reservas abandonadas.

Estratégia:

1. Pausar temporariamente novas reservas.
2. Ler estado oficial do PostgreSQL.
3. Recalcular estoque disponível por lote.
4. Recriar chaves necessárias no Redis.
5. Validar divergências.
6. Reativar checkout.

A regra principal é: **o PostgreSQL é a fonte de verdade; o Redis é camada de concorrência e cache operacional.**

---

## Webhooks e Pagamentos

Webhooks de pagamento devem ser tratados como eventos críticos.

Regras obrigatórias:

- [ ] Webhooks idempotentes.
- [ ] Persistência do payload bruto.
- [ ] Registro de tentativas.
- [ ] Validação de assinatura do gateway.
- [ ] Reprocessamento manual.
- [ ] Conciliação periódica com o gateway.
- [ ] Alertas para webhook com falha.
- [ ] Alertas para pagamento aprovado sem ingresso emitido.

Cenários de recuperação:

| Cenário | Ação |
|---|---|
| Pagamento aprovado, webhook não recebido | Rodar conciliação com gateway |
| Webhook duplicado | Ignorar com idempotency key |
| Pagamento aprovado, emissão falhou | Reprocessar outbox |
| Pedido expirado, mas pagamento aprovado | Encaminhar para fila de resolução manual |
| Reembolso solicitado, gateway indisponível | Manter pendente e tentar novamente |

---

## Filas e Jobs

BullMQ deve suportar recuperação operacional.

Regras:

- [ ] Retries com backoff exponencial.
- [ ] Dead-letter queue para jobs falhos.
- [ ] Dashboard BullMQ Board.
- [ ] Alertas para fila travada.
- [ ] Alertas para excesso de jobs falhos.
- [ ] Reprocessamento manual seguro.
- [ ] Jobs idempotentes.

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

## Staff PWA e Check-in Offline

A portaria deve continuar operando mesmo com internet instável.

Regras:

- [ ] Cache local dos ingressos válidos por evento/setor.
- [ ] IndexedDB como storage local.
- [ ] Validação local por assinatura HMAC.
- [ ] Registro local de check-ins.
- [ ] Sincronização posterior.
- [ ] Resolução de conflitos.
- [ ] Bloqueio contra reutilização local.
- [ ] Log de dispositivo, operador e horário.

Conflitos possíveis:

| Conflito | Resolução |
|---|---|
| Mesmo QR validado em dois dispositivos offline | Marcar como conflito e enviar para auditoria |
| Ticket cancelado após cache offline | Exigir sync antes do evento ou janela máxima de cache |
| Dispositivo não autorizado | Bloquear sync e alertar operador |

---

## RTO e RPO

| Serviço | RTO alvo | RPO alvo |
|---|---:|---:|
| Checkout | 15 min | 5 min |
| Pagamento/Webhook | 30 min | 0-5 min |
| Banco PostgreSQL | 30 min | 5 min |
| Redis | 15 min | Recalculável |
| Staff PWA | Offline tolerante | Sync posterior |
| Dashboard | 1h | 15 min |
| E-mails | 2h | Reprocessável |

RTO: tempo máximo aceitável para voltar.
RPO: perda máxima aceitável de dados.

---

## Procedimento de Incidente

1. Detectar falha por alertas.
2. Classificar severidade.
3. Congelar operações sensíveis, se necessário.
4. Identificar componente afetado.
5. Ativar plano específico.
6. Restaurar serviço.
7. Reprocessar filas/eventos pendentes.
8. Validar integridade financeira e de ingressos.
9. Registrar postmortem.
10. Criar ações preventivas.

---

## Severidade

| Nível | Exemplo | Ação |
|---|---|---|
| SEV1 | Checkout fora, banco indisponível, pagamento inconsistente | Resposta imediata |
| SEV2 | Webhook falhando, filas acumuladas, PWA sem sync | Corrigir no mesmo dia |
| SEV3 | Dashboard fora, relatórios lentos | Corrigir em janela planejada |
| SEV4 | Bug visual, métrica atrasada | Backlog normal |

---

## Postmortem

Todo incidente SEV1 ou SEV2 deve gerar postmortem contendo:

- O que aconteceu.
- Quando começou.
- Quando foi detectado.
- Impacto.
- Causa raiz.
- Como foi corrigido.
- O que será feito para não repetir.
- Tarefas técnicas geradas.

---

## Checklist de Produção

- [ ] Backup automático configurado.
- [ ] Restore testado.
- [ ] Healthchecks ativos.
- [ ] Alertas de banco, Redis, API e filas.
- [ ] BullMQ Board protegido.
- [ ] Webhooks idempotentes.
- [ ] Conciliação financeira.
- [ ] Logs com requestId.
- [ ] Sentry ativo.
- [ ] Uptime monitorado.
- [ ] Runbook de incidentes documentado.
