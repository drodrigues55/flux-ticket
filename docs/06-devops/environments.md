# Ambientes (Environments)

## Objetivo

Definir os ambientes do Flux Tickets, suas responsabilidades, variáveis, serviços externos e regras de segurança.

O projeto deve manter separação rígida entre:

- `development`
- `staging`
- `production`

Nenhum ambiente deve compartilhar banco, Redis, buckets, credenciais de gateway ou secrets.

---

## Development

Ambiente local usado por desenvolvedores.

### Serviços

- PostgreSQL local via Docker.
- Redis local via Docker.
- BullMQ local.
- APIs locais.
- Frontend local.
- Gateway em sandbox.
- E-mail em modo sandbox ou provider de teste.

### Regras

- Pode usar dados fictícios.
- Pode usar seeds.
- Não pode usar credenciais reais de produção.
- Logs podem ser mais verbosos.
- Debug habilitado.

### Variáveis típicas

```env
NODE_ENV=development
APP_ENV=development
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
HMAC_SECRET=
LOG_LEVEL=debug
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
```

---

## Staging

Ambiente de validação antes da produção.

Deve replicar produção o máximo possível.

### Serviços

- Banco isolado.
- Redis isolado.
- Gateway em sandbox ou homologação.
- Storage separado.
- Sentry habilitado.
- Logs estruturados.
- BullMQ Board habilitado e protegido.
- Uptime monitor opcional.
- Deploy automatizado a partir da branch principal ou release.

### Regras

- Deve receber migrations antes da produção.
- Deve validar fluxo completo de compra.
- Deve validar webhooks.
- Deve validar emissão de QR Code.
- Deve validar Staff PWA.
- Deve validar dashboard com dados realistas.
- Pode conter dados fictícios, mas com volume semelhante ao real.

### Variáveis típicas

```env
NODE_ENV=production
APP_ENV=staging
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
HMAC_SECRET=
LOG_LEVEL=info
SENTRY_DSN=
SENTRY_ENVIRONMENT=staging
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
RESEND_API_KEY=
STORAGE_BUCKET=
```

---

## Production

Ambiente real usado por consumidores, organizadores e staff.

### Serviços

- PostgreSQL gerenciado.
- Redis gerenciado.
- APIs com healthcheck.
- Frontends com CDN.
- Gateway em produção.
- E-mail transacional real.
- Storage privado.
- Sentry ativo.
- Logs centralizados.
- BullMQ Board protegido.
- Monitoramento de uptime.
- Backups automáticos.

### Regras

- Nunca usar seeds destrutivos.
- Nunca expor stack trace ao usuário.
- Nunca logar dados sensíveis.
- Nunca versionar secrets.
- Migrations devem ter plano de rollback.
- Deploy deve ser automatizado e rastreável.
- Webhooks devem ser idempotentes.
- Todos os erros devem carregar `requestId`.

### Variáveis típicas

```env
NODE_ENV=production
APP_ENV=production
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
HMAC_SECRET=
LOG_LEVEL=info
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
RESEND_API_KEY=
STORAGE_BUCKET=
PROMETHEUS_ENABLED=true
```

---

## Variáveis Obrigatórias

### Core

```env
APP_ENV=
NODE_ENV=
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
HMAC_SECRET=
```

### Pagamentos

```env
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_WEBHOOK_URL=
```

### E-mail

```env
RESEND_API_KEY=
MAIL_FROM=
```

### Observabilidade

```env
SENTRY_DSN=
SENTRY_ENVIRONMENT=
LOG_LEVEL=
PROMETHEUS_ENABLED=
```

### Wallet

```env
APPLE_PASS_TYPE_ID=
APPLE_TEAM_ID=
APPLE_CERT_PATH=
APPLE_CERT_PASSWORD=
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_CREDENTIALS_PATH=
```

---

## Segurança de Secrets

- [ ] Secrets nunca devem ser comitados.
- [ ] `.env` deve estar no `.gitignore`.
- [ ] Usar secrets do provedor de deploy.
- [ ] Separar chaves por ambiente.
- [ ] Rotacionar secrets periodicamente.
- [ ] Revogar chaves comprometidas imediatamente.
- [ ] Evitar logs de variáveis de ambiente.

---

## Ambientes Externos

| Serviço | Development | Staging | Production |
|---|---|---|---|
| Mercado Pago | Sandbox | Sandbox/Homologação | Produção |
| Apple Wallet | Dev certificate | Staging certificate | Production certificate |
| Google Wallet | Test issuer | Test issuer | Approved issuer |
| Resend/E-mail | Sandbox | Test domain | Production domain |
| Sentry | Opcional | Obrigatório | Obrigatório |
| Storage | Local/S3 dev | Bucket staging | Bucket production |

---

## Checklist antes de Produção

- [ ] Variáveis obrigatórias configuradas.
- [ ] Gateway em produção homologado.
- [ ] Webhook público configurado.
- [ ] Sentry recebendo eventos.
- [ ] Logs estruturados ativos.
- [ ] Backup automático ativo.
- [ ] Redis protegido.
- [ ] BullMQ Board protegido por autenticação.
- [ ] Staff PWA testado em ambiente realista.
- [ ] QR Code validado offline.
- [ ] Reprocessamento de filas testado.
- [ ] Política de LGPD publicada.
