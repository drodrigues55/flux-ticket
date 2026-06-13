# Flux Tickets & Core Engine
## Dossiê Técnico de Engenharia de Sistemas de Alta Escala e Concorrência

### 🏛️ Visão Geral da Arquitetura
O Flux Tickets é uma plataforma de venda de ingressos projetada para suportar os estresses mais extremos de tráfego concorrente (por exemplo, abertura de lotes de shows de grande porte). O ecossistema destrincha o pipeline completo de transação, segurança e sincronização de dados distribuídos em uma topografia de microsserviços.

#### Fluxo do Sistema
```text
[ PORTAL DO CONSUMIDOR (Next.js Client) ]
                                         │
                                         ▼
                                   [ API CORE ]
                                  (NestJS/Fastify)
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
             [ ENGINE DE TRANSISTORES ]               [ QUEUE ENGINE ]
             - Redis Cache (Single Stream)            - BullMQ Worker Engine
             - Pessimistic Lua Scripts (Lock)         - Post-Purchase Validation SLA
                     │                                       │
                     └───────────────────┬───────────────────┘
                                         ▼
                             [ TRANSACIONAL DATABASE ]
                              - PostgreSQL (ACID)
                              - SELECT FOR UPDATE Locks