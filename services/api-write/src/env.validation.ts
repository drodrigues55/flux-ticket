const DEV_DEFAULTS = new Set([
  'dev-jwt-secret-key',
  'client-dev-jwt-secret-key-12345',
  'dev-ticket-secret',
]);

const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_HOST',
  'REDIS_PORT',
  'TICKET_HMAC_SECRET',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_SECRET',
];

export function validateRuntimeEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  const unsafe = ['JWT_SECRET', 'TICKET_HMAC_SECRET'].filter((key) => DEV_DEFAULTS.has(process.env[key] || ''));

  if (missing.length > 0 || unsafe.length > 0) {
    const parts = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(', ')}`);
    if (unsafe.length > 0) parts.push(`unsafe defaults: ${unsafe.join(', ')}`);
    throw new Error(`Invalid production environment (${parts.join('; ')})`);
  }
}
