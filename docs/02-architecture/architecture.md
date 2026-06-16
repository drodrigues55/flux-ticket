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
