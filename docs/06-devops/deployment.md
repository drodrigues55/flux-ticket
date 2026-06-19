# Deployment CI/CD Pipeline

## Objetivo

Definir o fluxo de build, teste, deploy e rollback do Flux Tickets em ambientes de staging e produção.

O deploy deve ser previsível, automatizado, rastreável e seguro.

---

## Componentes Publicáveis

### Aplicações

- `apps/client`
- `apps/dashboard`
- `apps/staff-pwa`

### Serviços

- `services/api-read`
- `services/api-write`
- `services/workers`

### Pacotes internos

- `packages/database`
- `packages/ui`
- `packages/config`
- `packages/types`
- `packages/crypto`

---

## Containers

Dockerfiles individuais devem existir para:

- `api-read`
- `api-write`
- `workers`
- `apps/client`
- `apps/dashboard`
- `apps/staff-pwa`

Cada container deve:

- Receber variáveis por ambiente.
- Expor healthcheck.
- Não conter `.env` embutido.
- Rodar como usuário não-root quando possível.
- Ter build reprodutível.

---

## Pipeline CI/CD

### Pull Request

Executar:

- Instalação de dependências.
- Typecheck.
- Lint.
- Testes unitários.
- Testes de integração, quando aplicável.
- Build das aplicações.
- Validação do Prisma schema.
- Checagem de migrations.

### Merge na branch principal

Executar:

- Build de containers.
- Push para registry.
- Deploy em staging.
- Rodar migrations em staging.
- Smoke tests.
- Teste de checkout sandbox.
- Teste de webhook sandbox.
- Teste de Staff PWA básico.

### Release de produção

Executar:

- Criar tag/release.
- Backup antes da migration.
- Rodar migrations.
- Deploy gradual.
- Smoke tests.
- Monitoramento pós-deploy.
- Plano de rollback disponível.

---

## Migrations

Regras:

- Nunca rodar migrations destrutivas sem plano.
- Fazer backup antes de migrations críticas.
- Testar migrations em staging.
- Preferir migrations compatíveis com versões anteriores.
- Evitar renomear/remover colunas em deploy único.
- Separar deploy de código e remoção de campo quando necessário.

---

## Healthchecks

Cada serviço deve expor:

`GET /health`

Response:

```json
{
  "status": "ok",
  "service": "api-write",
  "environment": "production",
  "timestamp": "2026-06-18T20:00:00.000Z"
}
```

Healthchecks internos podem validar:

- Banco.
- Redis.
- BullMQ.
- Storage.
- Gateway, apenas em modo leve.

---

## Rollback

Rollback deve considerar:

- Código.
- Containers.
- Migrations.
- Configurações.
- Filas.
- Workers.

Tipos:

### Rollback simples

Voltar imagem anterior.

### Rollback com banco

Usar apenas se migration for incompatível.

### Rollforward

Preferível quando possível: corrigir com nova versão sem restaurar banco.

---

## Serviços de Produção

Mínimo recomendado para MVP:

- Frontend consumer.
- Frontend dashboard.
- Staff PWA.
- API read.
- API write.
- Worker.
- PostgreSQL.
- Redis.
- Storage.
- Gateway de pagamento.
- E-mail transacional.
- Sentry.
- BullMQ Board.
- Uptime Kuma.

Evolução:

- Prometheus.
- Grafana.
- Loki.
- Alertmanager.
- Tempo/OpenTelemetry.

---

## Secrets

Secrets devem ser injetados pelo provedor de deploy.

Nunca versionar:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `HMAC_SECRET`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- Certificados Apple
- Credenciais Google Wallet
- Storage secrets

---

## Observabilidade no Deploy

Após cada deploy:

- Confirmar Sentry sem aumento de erros.
- Confirmar filas processando.
- Confirmar API respondendo.
- Confirmar webhooks ativos.
- Confirmar checkout sandbox/staging.
- Confirmar logs com requestId.
- Confirmar métricas de latência.

---

## Checklist de Produção

- [ ] CI rodando em PR.
- [ ] Build automatizado.
- [ ] Deploy staging.
- [ ] Deploy produção.
- [ ] Migrations testadas.
- [ ] Backup antes da produção.
- [ ] Healthchecks.
- [ ] Rollback documentado.
- [ ] Secrets fora do versionamento.
- [ ] Sentry ativo.
- [ ] BullMQ Board protegido.
- [ ] Uptime Kuma ativo.
- [ ] Webhook de produção configurado.
