# Deployment CI/CD Pipeline

## Deploy e Infraestrutura
- **Containers:** Dockerfiles individuais criados para `api-write`, `api-read`, `apps/client` e `apps/dashboard`.
- **Orquestração:** Configurações preparadas para Kubernetes ou AWS ECS.
- **Pipeline CI/CD:** Testes automatizados executados a cada Pull Request e deploy em staging após merge em main.
