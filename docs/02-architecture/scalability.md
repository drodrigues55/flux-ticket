# Escalabilidade e Alta Demanda

## Escalabilidade Horizontal
- A API Core desenvolvida em Fastify é completamente stateless, permitindo a duplicação de containers dinamicamente em picos de requisições.
- O banco de dados PostgreSQL utiliza réplicas de leitura para consultas de catálogo de eventos, aliviando o banco de escrita primário.

## Otimização no Redis Cluster
- As chaves de travas e cotas são agrupadas usando delimitadores `{batchId}` para garantir que operações atômicas executem sempre na mesma partição de memória do cluster.
