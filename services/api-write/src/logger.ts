import pino from 'pino';

const REDACT_PATHS = [
  'req.headers.authorization',
  'headers.authorization',
  'authorization',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.password',
  '*.secret',
  '*.cvv',
  '*.cvc',
  '*.cardNumber',
  '*.cpf',
  '*.buyerCpf',
  '*.holderCpf',
  '*.paymentToken',
  '*.jwt',
  '*.HMAC_SECRET',
  '*.hmacSignature',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: {
    service: 'api-write',
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  },
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
});

export function maskCpf(value: string | null | undefined) {
  if (!value) return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return '[REDACTED]';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}
