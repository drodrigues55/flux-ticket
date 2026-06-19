# Architecture Overview (Visão Geral da Arquitetura)

## Objetivo

A arquitetura do Flux Tickets é desenhada como um monorepo com aplicações e serviços especializados para venda de ingressos, checkout concorrente, validação offline e dashboard operacional para organizadores.

A plataforma deve ser:

- Escalável horizontalmente.
- Segura por padrão.
- Resiliente a falhas de Redis, filas e gateway.
- Observável em produção.
- Data-driven para dashboards.
- Consistente em fluxos financeiros e emissão de ingressos.

---

## Componentes Físicos

### Apps

- **apps/client:** Portal público do consumidor, catálogo, checkout e área pós-venda.
- **apps/dashboard:** Painel do organizador com gestão de eventos, lotes, relatórios e dashboard inteligente.
- **apps/staff-pwa:** PWA de portaria com validação offline e sincronização posterior.

### Serviços

- **services/api-write:** Operações de escrita, checkout, reservas, pagamentos, webhooks e mutações críticas.
- **services/api-read:** Consultas otimizadas, catálogo público e dados de leitura.
- **services/workers:** Processamento assíncrono com BullMQ.

### Pacotes

- **packages/database:** Prisma Client e schema compartilhado.
- **packages/ui:** Componentes de interface compartilhados.
- **packages/config:** Configurações comuns.
- **packages/types:** Tipos compartilhados.
- **packages/crypto:** Assinatura HMAC e validações criptográficas.

---

## Fluxo de Compra

1. Consumidor acessa evento pelo `apps/client`.
2. `api-read` retorna dados públicos do evento.
3. Consumidor seleciona ingressos.
4. `api-write` reserva estoque no Redis com script Lua.
5. Reserva temporária é persistida no banco.
6. Consumidor inicia pagamento.
7. Gateway processa pagamento.
8. Webhook confirma status.
9. Worker emite ingresso.
10. Worker gera QR/HMAC.
11. Worker envia e-mail.
12. Wallet é gerada de forma assíncrona, quando aplicável.

---

## Concorrência e Estoque

O Redis é usado para controle de concorrência e locks de reserva.

O PostgreSQL é a fonte de verdade.

Regras:

- Estoque decrementado atomicamente via Lua.
- Reservas possuem TTL.
- Expiração devolve estoque.
- Pagamento aprovado consolida reserva.
- Redis pode ser reconstruído a partir do banco.
- Toda alteração crítica deve ser auditável.

---

## Padrão Outbox

Eventos críticos devem ser persistidos antes de serem processados por filas.

Exemplos:

- Pagamento aprovado.
- Ingresso emitido.
- Documento de meia-entrada pendente.
- Reembolso solicitado.
- Check-in sincronizado.
- Wallet solicitada.

A tabela `OutboxEvent` garante que eventos não sejam perdidos caso a API caia antes de publicar uma fila.

---

## Dashboard Data-Driven

O dashboard do organizador não deve usar dados mockados.

Todos os componentes devem consumir dados reais do banco por meio de contratos de API.

O backend deve preparar:

- KPIs.
- Score de prioridade por evento.
- Alertas operacionais.
- Performance de lotes.
- Receita por período.
- Receita por canal.
- Check-ins.
- Próximos repasses.

O frontend deve apenas renderizar dados prontos.

Para evitar cálculos pesados no browser, a arquitetura pode usar:

- Queries agregadas.
- Views.
- Tabelas analíticas.
- Jobs de agregação.
- Cache por período/evento.

---

## Priorização de Eventos

Eventos podem receber `priorityScore`.

Fatores:

- Proximidade da data.
- Vendas acelerando.
- Vendas desacelerando.
- Ocupação baixa.
- Ocupação alta.
- Lote próximo de esgotar.
- Pendências financeiras.
- Pendências de check-in.
- Reembolsos pendentes.
- Assets incompletos.
- Alto volume de suporte.

Níveis:

- `critical`
- `attention`
- `healthy`

A dashboard deve destacar automaticamente os eventos que exigem ação.

---

## Validação Offline

A Staff PWA deve validar ingressos mesmo sem conexão.

Estratégia:

- Baixar bundle do evento.
- Armazenar no IndexedDB.
- Validar assinatura HMAC localmente.
- Registrar check-in local.
- Sincronizar posteriormente.
- Resolver conflitos no backend.

---

## Segurança

Camadas:

- JWT para autenticação.
- RBAC para autorização.
- HMAC para QR Code.
- Rate limit no checkout.
- Validação de CPF.
- Idempotência em webhooks.
- Auditoria em ações sensíveis.
- Proteção contra enumeração de tickets.
- Secrets por ambiente.

---

## Observabilidade

Todos os serviços devem emitir:

- Logs estruturados.
- Métricas.
- Erros para Sentry.
- Request IDs.
- Healthchecks.
- Métricas de fila.
- Métricas de pagamento.
- Métricas de Redis e banco.

Ferramentas previstas:

- Sentry.
- Pino.
- BullMQ Board.
- Uptime Kuma.
- Prometheus.
- Grafana.
- Loki.

---

## Dependências Externas

Funcionalidades que não são apenas código:

### Pagamentos

- Conta Mercado Pago.
- Credenciais sandbox/produção.
- Webhooks.
- Homologação.

### Apple Wallet

- Conta Apple Developer.
- Pass Type ID.
- Certificados.
- Assinatura dos passes.

### Google Wallet

- Issuer.
- Credenciais.
- Classes.
- Objects.
- Aprovação.

### E-mail

- Provider transacional.
- Domínio verificado.
- DNS configurado.

---

## Princípios Arquiteturais

- PostgreSQL é fonte de verdade.
- Redis é camada operacional reconstruível.
- Workers processam tarefas demoradas.
- Webhooks são idempotentes.
- Dashboard é data-driven.
- Frontend não inventa dado.
- Logs não carregam dados sensíveis.
- Toda operação crítica é auditável.
