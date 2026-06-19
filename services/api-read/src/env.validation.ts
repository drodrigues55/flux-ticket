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
  if (process.env.JWT_SECRET && DEV_DEFAULTS.has(process.env.JWT_SECRET)) {
    missing.push('JWT_SECRET must not use a development default');
  }

  if (missing.length > 0) {
    throw new Error(`Invalid ${appEnv} environment (missing/unsafe: ${missing.join(', ')})`);
  }
}
