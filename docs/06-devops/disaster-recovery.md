# Recuperação de Desastres (Disaster Recovery)

## Planos de Backup e Contingência
- Backups automáticos de hora em hora do banco de dados relacional.
- Estratégia de reinicialização automática do Redis caso perca dados de estoque (recuperando informações a partir das tabelas `TicketBatch` e `Ticket` do banco de dados relacional).
