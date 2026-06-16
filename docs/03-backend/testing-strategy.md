# Estratégia de Testes

## Tipos de Testes
- **Testes Unitários:** Validação de regras de negócios de criação de assinaturas, CPF e expirações.
- **Testes de Integração:** Testar a comunicação entre NestJS, Redis (simulando locks) e PostgreSQL.
- **Testes de Carga:** Simular 10.000 requisições simultâneas por minuto nos endpoints de reserva para certificar a resiliência do estoque concorrente.
