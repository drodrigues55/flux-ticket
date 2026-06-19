# Flux Tickets - Master Roadmap & Status

> Atualizado: 18/06/2026

## Visão Geral

O Flux Tickets é uma plataforma de venda de ingressos composta por:

- Portal do consumidor.
- Área pós-venda do consumidor.
- Painel do organizador.
- PWA de portaria.
- Core de checkout, pagamentos, filas, Redis e validação offline.
- Infraestrutura de produção e observabilidade.

Este roadmap separa o que já foi feito, o que falta para MVP e o que depende de terceiros, configuração externa ou arquitetura de dados.

---

## 1. Portal do Consumidor (`apps/client`)

### Concluído

- [x] Proteção de estoque por heartbeat.
- [x] Hook React para reserva temporária.
- [x] Chamadas em memória no Redis.
- [x] UX de fila e cronômetro.
- [x] Cronômetro dinâmico validado.
- [x] Estilização Cosmic Slate / tema claro Material.
- [x] Catálogo de eventos.
- [x] Filtros por categoria.
- [x] Scroll inteligente.
- [x] Integração com `api-read`.
- [x] Estrutura de reserva.
- [x] Captura de CPF.
- [x] Campos de cartão.

### Falta

- [ ] Integração Mercado Pago.
- [ ] SDK de pagamento.
- [ ] Webhook de pagamento.
- [ ] PIX.
- [ ] Cartão.
- [ ] Parcelamento.
- [ ] Validação de CPF por dígito verificador.
- [ ] Rate limiting no checkout.
- [ ] Recuperação de pagamento pendente.
- [ ] Carrinho abandonado.
- [ ] Lista de espera para lote esgotado.
- [ ] Tratamento global de erros no checkout.

---

## 2. Perfil do Consumidor / Pós-Venda

### Concluído

- [x] SLA de cancelamento.
- [x] Worker BullMQ.
- [x] Filtro inteligente `isHalfPrice`.
- [x] Assinatura criptográfica HMAC validada no backend.

### Falta

- [ ] Upload de documento de meia-entrada.
- [ ] Rota de processamento de documento.
- [ ] Validação manual/automática de meia-entrada.
- [ ] Motor de QR Code.
- [ ] QR Code dinâmico.
- [ ] Apple Wallet `.pkpass`.
- [ ] Google Wallet.
- [ ] PDF do ingresso.
- [ ] Histórico de compras.
- [ ] Solicitação de reembolso/cancelamento.
- [ ] Reenvio de ingresso.

---

## 3. Painel do Organizador (`apps/dashboard`)

### Concluído

- [x] Segurança com JWT.
- [x] RBAC.
- [x] CRUD de eventos.
- [x] CRUD de lotes.
- [x] Integração com `sectorId`.
- [x] Integração com `categoryId`.
- [x] Design Cosmic Slate aplicado.

### Falta

- [ ] Dashboard de métricas com dados reais.
- [ ] Gráficos de vazão e faturamento real.
- [ ] Hero Card para evento prioritário.
- [ ] Score de prioridade por evento.
- [ ] Cards dinâmicos por demanda.
- [ ] Alertas operacionais.
- [ ] Lotes próximos de esgotar.
- [ ] Receita por evento.
- [ ] Receita por lote.
- [ ] Receita por canal.
- [ ] Conversão por canal.
- [ ] Ticket médio.
- [ ] Próximos repasses.
- [ ] Exportação de relatórios.
- [ ] Ações rápidas próximas ao topo.
- [ ] Dashboard data-driven sem dados mockados.

---

## 4. PWA Portaria (`apps/staff-pwa`)

### Concluído

- [x] IndexedDB.
- [x] Service Worker.
- [x] Sync offline.
- [x] Validação criptográfica por hash/HMAC.
- [x] Interface visual concluída.

### Falta

- [ ] Scanner real com `html5-qrcode`.
- [ ] Restrição física por ID de dispositivo.
- [ ] Trava de setor.
- [ ] Check-in manual.
- [ ] Histórico de check-ins.
- [ ] Resolução de conflitos offline.
- [ ] Sync pós-evento.
- [ ] Relatório de check-in por setor.
- [ ] Relatório de check-in por dispositivo.
- [ ] Modo contingência para portaria.

---

## 5. Core Engine e Infraestrutura Interna

### Concluído

- [x] Arquitetura ACID.
- [x] Script Lua para concorrência.
- [x] Padrão Outbox.
- [x] Hash Tags `{batchId}`.
- [x] Redis Cluster.
- [x] Self-healing Redis.
- [x] Sincronização automática com banco.
- [x] Correção de portas.
- [x] Eliminação de processos zumbis.

### Falta

- [ ] BullMQ Board.
- [ ] Healthchecks.
- [ ] Retry dashboard.
- [ ] Dead-letter queues.
- [ ] Reprocessamento manual auditado.
- [ ] Logs estruturados com requestId.
- [ ] Tratamento global de erros HTTP.
- [ ] Testes de concorrência.
- [ ] Testes de carga no checkout.

---

## 6. Pagamentos, Financeiro e Repasse

### Falta

- [ ] Conciliação de pagamentos.
- [ ] Status financeiro por pedido.
- [ ] Split de pagamento, caso o gateway escolhido suporte.
- [ ] Agenda de repasses.
- [ ] Reembolso parcial.
- [ ] Reembolso total.
- [ ] Chargeback.
- [ ] Histórico financeiro por evento.
- [ ] Relatório de taxas.
- [ ] Extrato do organizador.
- [ ] Validação de pagamento aprovado sem ingresso.
- [ ] Validação de ingresso emitido sem pagamento confirmado.

### Dependências externas

- Conta Mercado Pago.
- Credenciais sandbox.
- Credenciais produção.
- Webhook público configurado.
- Conta bancária do organizador.
- Regras do gateway para split e repasse.

---

## 7. Ingressos, QR Code e Wallet

### Falta

- [ ] Estados completos do ingresso.
- [ ] Histórico de status.
- [ ] Versionamento do QR Code.
- [ ] Revogação de QR Code.
- [ ] Reemissão de ingresso.
- [ ] Bloqueio contra reutilização.
- [ ] QR Code regenerável.
- [ ] Apple Wallet.
- [ ] Google Wallet.

### Dependências externas

- Apple Developer Program.
- Pass Type ID.
- Certificados Apple.
- Google Wallet Issuer.
- Aprovação Google Wallet.
- Credenciais de assinatura.

---

## 8. Segurança e Antifraude

### Concluído

- [x] JWT.
- [x] RBAC.
- [x] HMAC.

### Falta

- [ ] Rate limiting no checkout.
- [ ] Limite por IP.
- [ ] Limite por CPF.
- [ ] Limite por e-mail.
- [ ] Limite por dispositivo.
- [ ] Fingerprint básico.
- [ ] Detecção de reservas abandonadas em massa.
- [ ] Proteção contra enumeração de ingressos.
- [ ] Proteção contra enumeração de QR Codes.
- [ ] Rotação de secrets.
- [ ] Auditoria de ações administrativas.
- [ ] Validação de CPF por módulo 11.

---

## 9. Compliance e LGPD

### Falta

- [ ] Termos de uso.
- [ ] Política de privacidade.
- [ ] Registro de aceite.
- [ ] Registro de IP.
- [ ] Registro de user-agent.
- [ ] Exportação de dados do usuário.
- [ ] Exclusão de dados do usuário.
- [ ] Política de retenção de documentos de meia-entrada.
- [ ] Política de cancelamento por evento.
- [ ] Consentimento de comunicação.

---

## 10. Suporte e Operação Interna

### Falta

- [ ] Painel interno de atendimento.
- [ ] Busca por pedido.
- [ ] Busca por CPF.
- [ ] Busca por e-mail.
- [ ] Busca por QR Code.
- [ ] Busca por evento.
- [ ] Reenvio de ingresso.
- [ ] Cancelamento manual.
- [ ] Alteração manual de status com auditoria.
- [ ] Timeline do pedido.
- [ ] Observações internas.
- [ ] Motivo obrigatório para ações sensíveis.

---

## 11. Marketing e Vendas

### Falta

- [ ] Cupons por evento.
- [ ] Cupons por lote.
- [ ] Cupons por canal.
- [ ] Promoters.
- [ ] Afiliados.
- [ ] Links rastreáveis.
- [ ] UTM tracking.
- [ ] Pixel tracking.
- [ ] Origem das vendas.
- [ ] Conversão por canal.
- [ ] Ranking de cupons.
- [ ] Ranking de afiliados.
- [ ] Lista de espera.

---

## 12. Analytics e Dashboard Inteligente

### Falta

- [ ] Eventos em destaque.
- [ ] Eventos que exigem atenção.
- [ ] Score de prioridade.
- [ ] Hero Event.
- [ ] Cards médios de atenção.
- [ ] Cards compactos de eventos saudáveis.
- [ ] Performance dos lotes.
- [ ] Previsão de sold out.
- [ ] Crescimento de vendas.
- [ ] Queda de vendas.
- [ ] Receita por período.
- [ ] Receita por canal.
- [ ] Ticket médio.
- [ ] Conversão.
- [ ] Check-ins.
- [ ] Público esperado.
- [ ] Alertas acionáveis.
- [ ] Views ou tabelas analíticas.
- [ ] APIs específicas para widgets.

---

## 13. DevOps, Observabilidade e Produção

### Falta

- [ ] Sentry frontend/backend.
- [ ] Sentry nos workers.
- [ ] Pino com logs estruturados.
- [ ] Request ID em todas as APIs.
- [ ] BullMQ Board.
- [ ] Uptime Kuma.
- [ ] Prometheus.
- [ ] Grafana.
- [ ] Loki.
- [ ] Alertas de webhook.
- [ ] Alertas de fila travada.
- [ ] Alertas de banco.
- [ ] Alertas de Redis.
- [ ] CI/CD.
- [ ] Ambiente staging.
- [ ] Ambiente production.
- [ ] Backup automático.
- [ ] Teste de restore.
- [ ] Disaster Recovery runbook.

---

## Próximas Prioridades para MVP

### Crítico

- [ ] Mercado Pago + Webhook.
- [ ] QR Code.
- [ ] Scanner real.
- [ ] Emissão de ingresso.
- [ ] Dashboard com dados reais.
- [ ] Auditoria.
- [ ] Sentry.
- [ ] BullMQ Board.
- [ ] Rate limiting.

### Importante

- [ ] Wallet.
- [ ] Reembolso.
- [ ] Conciliação financeira.
- [ ] Painel de suporte.
- [ ] LGPD.
- [ ] Cupons e afiliados.

### Evolução

- [ ] Dashboard preditiva.
- [ ] Recomendação de abertura de lote.
- [ ] Previsão de receita.
- [ ] Previsão de sold out.
- [ ] IA para insights.
