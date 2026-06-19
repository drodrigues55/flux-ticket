import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: {
    service: 'api-read',
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'headers.authorization',
      'authorization',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.password',
      '*.secret',
      '*.hmacSignature',
      '*.jwt',
      '*.cpf',
      '*.buyerCpf',
      '*.holderCpf',
      '*.cardNumber',
      '*.cvv',
      '*.cvc',
      '*.paymentToken',
      '*.token',
      '*.HMAC_SECRET',
    ],
    censor: '[REDACTED]',
  },
});
