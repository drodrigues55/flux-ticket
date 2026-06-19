const DEV_DEFAULTS = new Set([
  'dev-jwt-secret-key',
  'client-dev-jwt-secret-key-12345',
  'dev-ticket-secret',
  'default-super-secret-key-12345',
  'replace-with-production-secret',
  'replace-with-ticket-signing-secret',
]);

const REQUIRED_BY_ENV = [
  'APP_ENV',
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
];

export function validateRuntimeEnv() {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const strict = appEnv === 'staging' || appEnv === 'production' || process.env.NODE_ENV === 'production';
  if (!strict) return;

  const missing = REQUIRED_BY_ENV.filter((key) => !process.env[key]);
  const hasRedis = !!process.env.REDIS_URL || (!!process.env.REDIS_HOST && !!process.env.REDIS_PORT);
  if (!hasRedis) missing.push('REDIS_URL or REDIS_HOST/REDIS_PORT');

  const hmacSecret = process.env.HMAC_SECRET || process.env.HMAC_SECRET_KEY || process.env.TICKET_HMAC_SECRET;
  if (!hmacSecret) missing.push('HMAC_SECRET');

  const unsafe = ['JWT_SECRET'].filter((key) => DEV_DEFAULTS.has(process.env[key] || ''));
  if (hmacSecret && DEV_DEFAULTS.has(hmacSecret)) unsafe.push('HMAC_SECRET');

  if (missing.length > 0 || unsafe.length > 0) {
    const parts = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(', ')}`);
    if (unsafe.length > 0) parts.push(`unsafe defaults: ${unsafe.join(', ')}`);
    throw new Error(`Invalid production environment (${parts.join('; ')})`);
  }

  if (process.env.PROMETHEUS_ENABLED && !['true', 'false'].includes(process.env.PROMETHEUS_ENABLED)) {
    throw new Error('Invalid production environment (PROMETHEUS_ENABLED must be true or false)');
  }

  if (process.env.LOG_LEVEL && !['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(process.env.LOG_LEVEL)) {
    throw new Error('Invalid production environment (LOG_LEVEL is invalid)');
  }
}
