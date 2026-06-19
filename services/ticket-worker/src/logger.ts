import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: {
    service: 'ticket-worker',
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  },
  redact: {
    paths: [
      'authorization',
      '*.authorization',
      '*.token',
      '*.jwt',
      '*.password',
      '*.secret',
      '*.cpf',
      '*.buyerCpf',
      '*.holderCpf',
      '*.cardNumber',
      '*.cvv',
      '*.cvc',
      '*.paymentToken',
      '*.hmacSignature',
      '*.rawPayload',
    ],
    censor: '[REDACTED]',
  },
});
