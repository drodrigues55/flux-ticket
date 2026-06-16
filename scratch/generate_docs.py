import os

base_path = r"c:\Users\DRODRIGUES\Documents\flux-ticket"
docs_path = os.path.join(base_path, "docs")

# Create folders
folders = [
    "00-product",
    "01-domain",
    "02-architecture",
    "03-backend",
    "04-design",
    "05-ui",
    "06-devops"
]

for f in folders:
    os.makedirs(os.path.join(docs_path, f), exist_ok=True)

# Helper function to write md files
def write_md(folder, filename, content):
    filepath = os.path.join(docs_path, folder, filename)
    with open(filepath, "w", encoding="utf-8") as file:
        file.write(content.strip() + "\n")
    print(f"Created {filepath}")

# ----------------- 00-product -----------------
write_md("00-product", "product.md", """
# 01 - Definição do Produto

## Visão do Negócio
O **Flux Tickets** é uma plataforma moderna e resiliente de descoberta, venda, emissão e validação de ingressos, projetada para suportar eventos de alta concorrência com total segurança e com operação offline simplificada na portaria.

## Público-Alvo & Personas
- **Consumidores:** Buscam descobrir eventos de interesse, comprar ingressos com o menor atrito possível e gerenciar suas credenciais de acesso de forma simples.
- **Organizadores:** Necessitam de controle absoluto sobre lotes, cupons, faturamento em tempo real e relatórios operacionais.
- **Equipe de Portaria (Staff):** Operadores em campo que precisam realizar validação rápida de ingressos (check-in) em locais de alta densidade sem depender de conexão estável de internet.

## Problemas Resolvidos
- Evita overbooking em aberturas de lotes muito concorridos.
- Reduz custos de infraestrutura escalando apenas a camada de cache (Redis) em picos de demanda.
- Permite validação de ingressos offline com segurança contra clonagem de QR Codes.

## Métricas de Sucesso
- **Tempo médio de checkout:** Menos de 2 minutos.
- **Taxa de overbooking:** 0%.
- **Latência de leitura:** < 50ms para catálogo de eventos.
""")

write_md("00-product", "personas.md", """
# Personas do Produto

## 1. Lucas, o Fã de Festivais (Consumidor)
- **Perfil:** 24 anos, usuário mobile-first, busca conveniência, agilidade na compra e segurança no armazenamento de ingressos.
- **Dores:** Medo de fraudes em cambistas e frustração com filas virtuais lentas e instáveis.

## 2. Mariana, a Produtora de Eventos (Organizadora)
- **Perfil:** 35 anos, gerencia shows de médio e grande porte.
- **Dores:** Falta de telemetria em tempo real para tomada de decisão (mudar preços de lote) e preocupações com fraudes na portaria.

## 3. Roberto, o Operador de Portaria (Staff)
- **Perfil:** 29 anos, atua na linha de frente do controle de acessos.
- **Dores:** Falta de internet nos portões de estádios, lentidão nos aparelhos de leitura óptica e filas acumuladas.
""")

write_md("00-product", "roadmap.md", """
# MVP Roadmap (Roadmap de Entregas)

## Sprint 1: Fundação & Autenticação
- Setup do Monorepo, Docker e banco de dados relacional.
- Estruturação do NestJS e Next.js.
- Cadastro e login de usuários (JWT).

## Sprint 2: Core Domain & Eventos
- Cadastro de eventos, locais (venues) e lotes de ingressos.
- Filtro e busca de eventos no portal público.

## Sprint 3: Engine de Concorrência & Reserva
- Implementação de decremento atômico de cotas no Redis (scripts Lua).
- Lógica de expiração temporária de reserva (locks de checkout).

## Sprint 4: Checkout, Pagamento & Wallet
- Integração com provedor de pagamento.
- Emissão de ingressos e geração de assinaturas HMAC.
- Integração com Apple e Google Wallet.

## Sprint 5: PWA Staff & Auditoria
- PWA offline com IndexedDB para controle de acesso.
- Painel de telemetria e relatórios para organizadores.
""")

# ----------------- 01-domain -----------------
write_md("01-domain", "domain-driven-design.md", """
# Bounded Contexts e Domínio (DDD)

## Bounded Contexts
1. **Ticketing:** Reserva, emissão, ciclo de vida e criptografia dos ingressos.
2. **Payments:** Gateway de integração e processamento de pagamentos.
3. **Events:** Criação de eventos, locais de eventos (Venues) e lotes (Batches).
4. **Check-In:** Portaria, sincronização de hashes e fila de acessos offline.
5. **Identity:** Gestão de usuários, credenciais e controle de acessos (RBAC).

## Aggregates
- **Event Aggregate:** Event, Venue, Sector, Batch.
- **Order Aggregate:** Order, Payment.
- **Ticket Aggregate:** Ticket, CheckIn.

## Comandos (Commands)
- `CreateEvent`: Criação do evento e seus lotes associados.
- `ReserveTicket`: Reserva atômica temporária do lote.
- `ConfirmPayment`: Conclusão do processamento financeiro.
- `IssueTicket`: Emissão física do ingresso com assinatura.
- `CheckInTicket`: Registro de passagem na portaria.

## Eventos de Domínio (Domain Events)
- `TicketReserved`: Ingresso travado temporariamente.
- `PaymentApproved`: Transação aceita pelo gateway.
- `TicketIssued`: Ingresso assinado e disponível para download.
- `TicketCheckedIn`: Acesso validado no portão do evento.
""")

write_md("01-domain", "domain-model.md", """
# Entidades do Domínio

## User
- **Campos:** id, nome, email, cpf, senha, role (USER, ORGANIZER, STAFF).
- **Regras:** CPF e E-mail devem ser únicos.

## Event
- **Campos:** id, organizerId, title, description, date, location, categoryId.
- **Relacionamentos:** Pertence a um Organizador, possui múltiplos Lotes (TicketBatch).

## Ticket
- **Campos:** id, buyerId, batchId, status (VALID, REVOKED, CONSUMED), price, buyerCpf, signature.
- **Regras:** Cada ticket deve conter assinatura criptográfica gerada por HMAC-SHA256 baseada em seus metadados.

## Order
- **Campos:** id, userId, status (PENDING, PAID, FAILED), total, createdAt.
""")

write_md("01-domain", "state-machines.md", """
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
""")

write_md("01-domain", "event-storming.md", """
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
""")

# ----------------- 02-architecture -----------------
write_md("02-architecture", "architecture.md", """
# Architecture Overview (Visão Geral da Arquitetura)

A arquitetura do **Flux Tickets** é desenhada no formato de **Monorepo** com microsserviços stateless escaláveis horizontalmente e foco em concorrência na camada de memória.

## Componentes Físicos
- **apps/client:** Portal público de consumidores otimizado para SEO, vendas e checkout.
- **apps/dashboard:** Painel de organizadores contendo relatórios, pânico e gestão de lotes.
- **apps/staff-pwa:** PWA de validação de portaria offline em campo.
- **services/api-write:** Microsserviço de escrita de checkout e sincronismo.
- **services/api-read:** Microsserviço de consulta otimizada de eventos.
- **packages/database:** Compartilhamento do Prisma client e banco de dados relacional PostgreSQL.
- **packages/ui:** Componentes de interface compartilhados.
""")

write_md("02-architecture", "concurrency-engine.md", """
# Concurrency Engine (Motor de Concorrência Redis)

Para evitar overbooking em eventos de altíssima demanda, a gestão de cotas de ingressos é delegada integralmente a um motor em memória no **Redis**.

## Lógica de Decremento Atômico (Lua Scripts)
Durante o checkout, a cota de ingressos é diminuída no Redis de forma atômica através do script Lua `reserve_ticket.lua`. Isso impede condições de corrida (*race conditions*):
```lua
local stock_key = KEYS[1]
local lock_key = KEYS[2]
local quantity = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current_stock = tonumber(redis.call('get', stock_key) or "0")
if current_stock >= quantity then
    redis.call('decrby', stock_key, quantity)
    redis.call('set', lock_key, quantity, 'EX', ttl)
    return 1 -- Sucesso
else
    return 0 -- Esgotado
end
```

## Reserva Temporária (Locks)
- **TTL Padrão:** O lote é reservado no Redis por 180 segundos (3 minutos).
- **Heartbeat de Renovação:** O frontend atualiza a validade do lock a cada 50 segundos chamando `/api/tickets/renew-lock` para evitar que a sessão expire se o usuário estiver preenchendo os dados do cartão.
- **Rollback / Compensação:** Se o pagamento falhar ou o tempo expirar, a cota é devolvida instantaneamente ao estoque do Redis (`releaseTicketLock`).
""")

write_md("02-architecture", "ticket-lifecycle.md", """
# Ciclo de Vida do Ingresso (Ticket Lifecycle)

## Estados do Ingresso
1. **PENDING_VALIDATION:** Ingresso reservado, porém aguardando análise de documentos de meia-entrada (SLA de 24h).
2. **VALID:** Ingresso pago e ativo. Pronto para check-in.
3. **REVOKED:** Cancelado pelo organizador ou reembolsado.
4. **CONSUMED:** Escaneado com sucesso e validado na portaria.

## Lógica de Criação e Liberação
No momento da compra, os ingressos são gerados como `PENDING_VALIDATION` ou `VALID`. Se houver contestação de pagamento (Chargeback) ou cancelamento pelo usuário, o status é alterado para `REVOKED` e o estoque correspondente é reabastecido no banco de dados relacional.
""")

write_md("02-architecture", "security.md", """
# Segurança, JWT e Criptografia

## Controle de Acesso
- **Autenticação:** Baseada em JWT com tokens de curta duração (Access Token) e tokens de renovação (Refresh Token) persistidos com HttpOnly cookies.
- **Autorização (RBAC):** Proteção de rotas separando acessos administrativos (`ORGANIZER`), equipe de portaria (`STAFF`) e consumidores (`USER`).

## Assinatura Criptográfica de Ingressos (HMAC)
Para evitar falsificação ou duplicação de QR Codes de ingressos, cada ticket emitido possui uma assinatura criptográfica **HMAC-SHA256**.
- **Payload:** `ticketId + buyerCpf + eventId + batchId`.
- **Validação Offline:** O Staff PWA armazena a chave secreta de validação e recalcula o hash localmente no celular. Se o hash do QR Code bater com a assinatura gerada, o ingresso é considerado autêntico, mesmo sem conexão de rede.
""")

write_md("02-architecture", "offline-validation.md", """
# Offline Staff Validation (Validação Offline de Portaria)

O aplicativo **Staff PWA** é projetado para operar em condições de conectividade zero.

## Funcionamento Offline
1. **Sincronização Pré-Evento:** Antes do início das validações, os operadores realizam o download das assinaturas criptográficas dos ingressos válidos do evento para o **IndexedDB** local do navegador.
2. **Scanner e Check-In Local:** A câmera do celular escaneia o QR Code usando a biblioteca ZXing. O aplicativo descriptografa e compara a assinatura HMAC com a base do IndexedDB.
3. **Fila Offline:** Quando um check-in é efetuado com sucesso offline, ele entra em uma fila de sincronização no IndexedDB.
4. **Reconciliação:** Ao detectar sinal de internet, o PWA despacha a fila de check-ins sequencialmente para a API Core. O servidor processa os dados cronologicamente e descarta duplicatas em caso de fraude.
""")

write_md("02-architecture", "scalability.md", """
# Escalabilidade e Alta Demanda

## Escalabilidade Horizontal
- A API Core desenvolvida em Fastify é completamente stateless, permitindo a duplicação de containers dinamicamente em picos de requisições.
- O banco de dados PostgreSQL utiliza réplicas de leitura para consultas de catálogo de eventos, aliviando o banco de escrita primário.

## Otimização no Redis Cluster
- As chaves de travas e cotas são agrupadas usando delimitadores `{batchId}` para garantir que operações atômicas executem sempre na mesma partição de memória do cluster.
""")

# ----------------- 03-backend -----------------
write_md("03-backend", "database.md", """
# Modelagem do Banco de Dados (Database Schema)

## Tabelas Principais (Prisma mapping)
- **User:** Contém dados de autenticação e perfis.
- **Event:** Metadados dos eventos.
- **TicketBatch:** Lotes vinculados aos setores, com campos de preço e estoque total/disponível.
- **Ticket:** Registros de cada ingresso emitido contendo o CPF do portador, status e assinatura HMAC.
- **OutboxEvent:** Tabela para auditoria e garantia de entrega de eventos para as filas de e-mail e wallets.

## Índices Recomendados
- Índice único no CPF e E-mail do usuário.
- Índice composto em `Ticket` nas colunas `buyerId` e `status` para consultas de wallet rápidas.
""")

write_md("03-backend", "api-contracts.md", """
# Contratos de APIs (API Contracts)

## APIs Públicas (apps/client)
- `POST /api/tickets/reserve`: Reserva cotas de ingressos temporariamente no Redis (suporta múltiplos lotes).
  - *Request Body:* `{ eventId: string, items: Array<{ batchId: string, price: number, quantity: number }> }`
  - *Response:* `{ ticketId: "t1,t2", userId: "guest-id" }`
- `POST /api/tickets/renew-lock`: Estende o lock temporário de ingressos em andamento no Redis (busca lotes no DB).
  - *Request Body:* `{ userId: string, ticketId: string }`
- `POST /api/payments/checkout`: Processa o formulário de pagamento e finaliza os ingressos reservados.
  - *Request Body:* `{ ticketId: string, buyerName: string, email: string, buyerCpf: string, paymentMethod: object, holders: array }`

## APIs de Dashboard (apps/dashboard)
- `POST /api/events`: CRUD de eventos.
- `POST /api/events/[id]/batches`: Gestão de lotes.
- `GET /api/events/[id]/reports`: Exportação de relatórios de faturamento.
""")

write_md("03-backend", "queues.md", """
# Filas de Processamento (Queues - BullMQ)

## Filas Operacionais
1. **ValidateHalfPriceDeadline:** Job executado de hora em hora para verificar se a SLA de 24h para envio do documento de meia-entrada estourou. Se sim, revoga o ticket e estorna o cliente.
2. **GenerateWalletPass:** Geração assíncrona do arquivo de Wallet (`.pkpass`) para Apple e Google Pay.
3. **SendTicketEmail:** Fila de envio de e-mails com arquivos PDF anexos.
4. **SyncOfflineCheckins:** Processa a fila de check-ins coletados offline pelas portarias.
""")

write_md("03-backend", "webhooks.md", """
# Integrações de Webhooks de Pagamento

## Provedor de Pagamentos
O gateway de pagamento (ex: Mercado Pago, Stripe) envia alertas sobre transações Pix e Cartão de Crédito.
- **Endpoint:** `POST /api/payments/webhook`
- **Lógica de Entrada:**
  1. Validar a assinatura do webhook enviada no header.
  2. Identificar a transação e o ticket associado.
  3. Se o status for aprovado, chamar a aprovação do ingresso no backend (gerando o HMAC hash e mudando status para `VALID`).
  4. Se o pagamento falhar ou for estornado, marcar o ticket como `REVOKED`.
""")

write_md("03-backend", "testing-strategy.md", """
# Estratégia de Testes

## Tipos de Testes
- **Testes Unitários:** Validação de regras de negócios de criação de assinaturas, CPF e expirações.
- **Testes de Integração:** Testar a comunicação entre NestJS, Redis (simulando locks) e PostgreSQL.
- **Testes de Carga:** Simular 10.000 requisições simultâneas por minuto nos endpoints de reserva para certificar a resiliência do estoque concorrente.
""")

# ----------------- 04-design -----------------
write_md("04-design", "design-system.md", """
# Design System

Documentação de diretrizes visuais do produto baseada no arquivo `design.md`.

## Tipografia Principal
- **Fonte:** Inter
```css
font-family: "Inter", system-ui, sans-serif;
```

## Cores Principais (Neutral Palette)
```css
--white: #FFFFFF;

--gray-50: #FAFAFA;
--gray-100: #F5F5F5;
--gray-200: #EAEAEA;
--gray-300: #DCDCDC;
--gray-400: #B5B5B5;
--gray-500: #8A8A8A;
--gray-600: #666666;
--gray-700: #4A4A4A;
--gray-800: #2D2D2D;
--gray-900: #111111;
```

## Accent Color (Apenas para CTAs e Destaques Importantes)
```css
--accent: #FF3200;
--accent-hover: #E62D00;
--accent-active: #CC2800;
```

## Semantic Colors
```css
--success: #16A34A;
--warning: #F59E0B;
--danger: #DC2626;
--info: #2563EB;
```

## Border Radius
- `sm:` 6px
- `md:` 10px
- `lg:` 14px
- `xl:` 20px
""")

write_md("04-design", "components.md", """
# Biblioteca de Componentes UI

## 1. Button Primário
- Fundo na cor `--accent` (`#FF3200`) e texto branco.
- Hover transiciona em 200ms ease-out para `--accent-hover` (`#E62D00`).

## 2. Inputs e Textareas
- Altura: 48px.
- Bordas de 1px solid `--gray-300` com raio de 10px.
- Focus ativa cor de borda roxa/laranja com sombra sutil `box-shadow: 0 0 0 3px rgba(255,50,0,.15)`.

## 3. EventCard
- Card contendo poster do evento com hover levantando levemente o card (`transform: translateY(-4px)` com sombra suave).
""")

write_md("04-design", "brand-guidelines.md", """
# Brand Guidelines & Tom de Voz

## Princípios de Marca
- **Confiança:** Transmitir robustez e segurança operacional.
- **Simplicidade:** Processo de compra de ingressos intuitivo e rápido.
- **Experiência Premium:** Visual minimalista, sem poluição visual.

## Filosofia de Design: Content First
Os eventos são o produto. A interface deve ser minimalista e invisível, servindo apenas como suporte para que os eventos, datas e preços sejam os protagonistas absolutos.
""")

# ----------------- 05-ui -----------------
write_md("05-ui", "consumer-portal.md", """
# Consumer Portal UI (apps/client)

## Telas Principais
- **Home:** Hero de destaque, barra de pesquisa rápida e grid de eventos em destaque com paginação dinâmica.
- **Busca:** Filtros rápidos por cidade, data, categorias e faixa de preço.
- **Página de Evento:** Layout de duas colunas (Esquerda: descrição, detalhes; Direita: seletor de ingressos sticky).
- **Checkout:** Stepper com as etapas de preenchimento de dados de comprador, dados de cada portador e finalização do pagamento.
""")

write_md("05-ui", "organizer-dashboard.md", """
# Organizer Dashboard UI (apps/dashboard)

## Funcionalidades do Dashboard
- **Painel Geral:** Gráficos SVG mostrando faturamento acumulado por evento e taxa de conversão diária.
- **Criação de Eventos:** CRUD de eventos com mapa de assentos SVG customizável e gerenciador de lotes.
- **Cupons:** Ferramenta para gerenciar cupons de desconto (fixos ou percentuais).
""")

write_md("05-ui", "staff-pwa.md", """
# Staff PWA UI (apps/staff-pwa)

## Interface de Validação do Operador
- **Tema Visual:** Cosmic Slate (design escuro para melhorar contraste da câmera e bateria sob sol).
- **Scanner View:** Tela cheia da câmera para leitura de códigos QR integrando feedback háptico (vibração) e visual (verde para sucesso, vermelho com som de erro para ingressos inválidos/duplicados).
- **Visualizador de Fila Offline:** Exibe o total de check-ins coletados offline aguardando sincronismo.
""")

write_md("05-ui", "user-flows.md", """
# Jornadas de Usuário (User Flows)

## Jornada de Compra
```text
Escolha do Evento → Seleção de Setores e Qtd → Reserva Temporária no Redis (3 min) 
   → Preenchimento de Comprador/Portadores → Pagamento → Confirmação e Emissão
```

## Jornada de Portaria Offline
```text
Download de hashes de acesso no PWA → Operador em campo offline → Scan do QR Code 
   → Validação do HMAC no dispositivo → Registro no IndexedDB → Conexão reestabelecida → Sincronismo
```
""")

# ----------------- 06-devops -----------------
write_md("06-devops", "deployment.md", """
# Deployment CI/CD Pipeline

## Deploy e Infraestrutura
- **Containers:** Dockerfiles individuais criados para `api-write`, `api-read`, `apps/client` e `apps/dashboard`.
- **Orquestração:** Configurações preparadas para Kubernetes ou AWS ECS.
- **Pipeline CI/CD:** Testes automatizados executados a cada Pull Request e deploy em staging após merge em main.
""")

write_md("06-devops", "observability.md", """
# Observabilidade e Monitoramento

## Telemetria Operacional
- **Logs:** Biblioteca Pino integrada ao backend para logs rápidos em formato JSON.
- **Métricas:** Prometheus capturando dados de latência, tráfego HTTP e logs de erros.
- **Grafana:** Dashboards operacionais mostrando uso de CPU, Redis hit ratio e transações ativas por segundo.
""")

write_md("06-devops", "environments.md", """
# Ambientes (Environments)

## Configuração de Ambientes
- **Development:** Conectado a containers locais (Postgres, Redis local).
- **Staging:** Ambiente que replica fielmente o setup de produção para testes de QA.
- **Production:** Escala elástica baseada em carga com monitoramento ativo.
""")

write_md("06-devops", "disaster-recovery.md", """
# Recuperação de Desastres (Disaster Recovery)

## Planos de Backup e Contingência
- Backups automáticos de hora em hora do banco de dados relacional.
- Estratégia de reinicialização automática do Redis caso perca dados de estoque (recuperando informações a partir das tabelas `TicketBatch` e `Ticket` do banco de dados relacional).
""")

# ----------------- README -----------------
readme_content = """
# Flux Tickets - Documentação Geral

Bem-vindo à documentação oficial da plataforma **Flux Tickets**. Esta pasta contém o backlog técnico, modelagem e guias de design organizados por áreas de interesse.

## Estrutura da Documentação

### 📂 00-product/ (Produto)
- [Visão Geral do Produto](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/00-product/product.md)
- [Personas do Negócio](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/00-product/personas.md)
- [Roadmap de Entregas](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/00-product/roadmap.md)

### 📂 01-domain/ (Regras de Domínio e DDD)
- [Contextos e Domínio (DDD)](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/01-domain/domain-driven-design.md)
- [Entidades do Domínio](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/01-domain/domain-model.md)
- [Ciclos de Vida e Estados](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/01-domain/state-machines.md)
- [Mapeamento Event Storming](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/01-domain/event-storming.md)

### 📂 02-architecture/ (Desenho Arquitetural)
- [Visão Geral da Arquitetura](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/02-architecture/architecture.md)
- [Motor de Concorrência Redis](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/02-architecture/concurrency-engine.md)
- [Ciclo de Vida do Ingresso](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/02-architecture/ticket-lifecycle.md)
- [Segurança e Criptografia](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/02-architecture/security.md)
- [Validação de Acesso Offline](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/02-architecture/offline-validation.md)
- [Escalabilidade do Sistema](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/02-architecture/scalability.md)

### 📂 03-backend/ (Persistência e APIs)
- [Banco de Dados e Índices](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/03-backend/database.md)
- [Contrato de APIs](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/03-backend/api-contracts.md)
- [Filas de Tarefas (BullMQ)](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/03-backend/queues.md)
- [Webhooks e Integrações](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/03-backend/webhooks.md)
- [Estratégias de Testes](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/03-backend/testing-strategy.md)

### 📂 04-design/ (Design System e Marca)
- [Design System & Tipografia](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/04-design/design-system.md)
- [Biblioteca de Componentes](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/04-design/components.md)
- [Tom de Voz e Guia de Marca](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/04-design/brand-guidelines.md)

### 📂 05-ui/ (Jornadas e Experiência)
- [Portal do Consumidor](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/05-ui/consumer-portal.md)
- [Dashboard do Organizador](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/05-ui/organizer-dashboard.md)
- [Scanner Staff PWA](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/05-ui/staff-pwa.md)
- [Jornadas e Fluxos](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/05-ui/user-flows.md)

### 📂 06-devops/ (Operações e Resiliência)
- [Pipeline de Deploy CI/CD](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/06-devops/deployment.md)
- [Observabilidade](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/06-devops/observability.md)
- [Configurações de Ambientes](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/06-devops/environments.md)
- [Recuperação de Desastres](file:///c:/Users/DRODRIGUES/Documents/flux-ticket/docs/06-devops/disaster-recovery.md)
"""

with open(os.path.join(docs_path, "README.md"), "w", encoding="utf-8") as f:
    f.write(readme_content.strip() + "\n")
print(f"Created {os.path.join(docs_path, 'README.md')}")
