const DEV_DEFAULTS = new Set([
  'dev-jwt-secret-key',
  'client-dev-jwt-secret-key-12345',
  'replace-with-production-secret',
]);

export function validateRuntimeEnv() {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const strict = appEnv === 'staging' || appEnv === 'production' || process.env.NODE_ENV === 'production';
  if (!strict) return;

  const missing = ['APP_ENV', 'NODE_ENV', 'DATABASE_URL', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (!process.env.REDIS_URL && !(process.env.REDIS_HOST && process.env.REDIS_PORT)) {
    missing.push('REDIS_URL or REDIS_HOST/REDIS_PORT');
  }
  const hmacSecret = process.env.HMAC_SECRET || process.env.HMAC_SECRET_KEY || process.env.TICKET_HMAC_SECRET;
  if (!hmacSecret) missing.push('HMAC_SECRET');
  if (process.env.JWT_SECRET && DEV_DEFAULTS.has(process.env.JWT_SECRET)) {
    missing.push('JWT_SECRET must not use a development default');
  }
  if (hmacSecret && DEV_DEFAULTS.has(hmacSecret)) {
    missing.push('HMAC_SECRET must not use a development default');
  }

  if (process.env.PROMETHEUS_ENABLED && !['true', 'false'].includes(process.env.PROMETHEUS_ENABLED)) {
    missing.push('PROMETHEUS_ENABLED must be true or false');
  }
  if (process.env.LOG_LEVEL && !['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(process.env.LOG_LEVEL)) {
    missing.push('LOG_LEVEL is invalid');
  }

  if (missing.length > 0) {
    throw new Error(`Invalid ${appEnv} environment (missing/unsafe: ${missing.join(', ')})`);
  }
}
