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
