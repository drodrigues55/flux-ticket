import test from 'node:test';
import assert from 'node:assert/strict';
import { MockEmailProvider, ResendEmailProvider } from './email-provider';

const baseMessage = {
  to: 'buyer@example.com',
  subject: 'Seu ingresso',
  html: '<p>Ingresso aprovado</p>',
  text: 'Ingresso aprovado',
} as const;

test('mock provider sends successfully', async () => {
  const provider = new MockEmailProvider();
  const result = await provider.sendTicketEmail(baseMessage);

  assert.equal(result.status, 'SENT');
  assert.equal(result.provider, 'mock');
  assert.equal(provider.sent.length, 1);
});

test('Resend provider maps success and provider message id', async () => {
  const provider = new ResendEmailProvider({
    apiKey: 're_test_secret',
    from: 'Flux <tickets@example.com>',
    fetchImpl: async (_url, init) => {
      assert.equal((init?.headers as any).Authorization, 'Bearer re_test_secret');
      assert.equal(JSON.parse(String(init?.body)).from, 'Flux <tickets@example.com>');
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
    },
  });

  const result = await provider.sendPurchaseConfirmation(baseMessage);

  assert.equal(result.status, 'SENT');
  assert.equal(result.provider, 'resend');
  assert.equal(result.messageId, 'email_123');
});

test('Resend provider handles permanent failure safely', async () => {
  const provider = new ResendEmailProvider({
    apiKey: 're_test_secret',
    from: 'Flux <tickets@example.com>',
    fetchImpl: async () => new Response(JSON.stringify({ name: 'validation_error', message: 'Invalid recipient' }), { status: 400 }),
  });

  const result = await provider.sendTicketEmail(baseMessage);

  assert.equal(result.status, 'FAILED');
  assert.equal(result.errorCode, 'validation_error');
  assert.equal(result.errorMessage, 'Invalid recipient');
});

test('Resend provider handles retryable failures', async () => {
  const provider = new ResendEmailProvider({
    apiKey: 're_test_secret',
    from: 'Flux <tickets@example.com>',
    fetchImpl: async () => new Response(JSON.stringify({ name: 'rate_limit_exceeded', message: 'Try again' }), { status: 429 }),
  });

  const result = await provider.sendTicketEmail(baseMessage);

  assert.equal(result.status, 'RETRYABLE');
  assert.equal(result.errorCode, 'rate_limit_exceeded');
});

test('missing Resend config fails safely without exposing secrets', () => {
  assert.throws(
    () => new ResendEmailProvider({ apiKey: '', from: '' }),
    /RESEND_API_KEY, EMAIL_FROM/
  );
});

test('Resend provider sanitizes secret-like tokens from error messages', async () => {
  const provider = new ResendEmailProvider({
    apiKey: 're_secret_should_not_leak',
    from: 'Flux <tickets@example.com>',
    fetchImpl: async () => {
      throw new Error('request failed with re_secret_should_not_leak');
    },
  });

  const result = await provider.sendTicketEmail(baseMessage);

  assert.equal(result.status, 'RETRYABLE');
  assert.equal(result.errorMessage?.includes('re_secret_should_not_leak'), false);
});
