import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateEventInputSchema, MinimalTicketTypeInputSchema, TicketBatchSchema } from './validation/event';
import { MockPaymentProviderCapability, MockPaymentScenarios } from './payment';
import { FinancialExportQuerySchema, FinancialPaymentLedgerQuerySchema } from './financial';

test('CreateEventInputSchema rejects missing name and startAt', () => {
  const result = CreateEventInputSchema.safeParse({
    slug: 'my-event',
    timezone: 'UTC',
    locationType: 'PHYSICAL',
  });
  assert.equal(result.success, false);
});

test('CreateEventInputSchema accepts dashboard wizard payload', () => {
  const result = CreateEventInputSchema.safeParse({
    name: 'Bee Gees Alive - Anapolis',
    slug: 'bee-gees-alive-anapolis',
    shortDescription: 'Future RC1 demo event.',
    description: 'Prepared event for RC1 dashboard and public purchase demo.',
    startAt: '2026-08-14T20:00:00.000Z',
    endAt: '2026-08-14T23:00:00.000Z',
    timezone: 'America/Cuiaba',
    locationType: 'PHYSICAL',
    venueName: 'Teatro Sao Francisco',
    city: 'Anapolis',
    state: 'GO',
    country: 'BR',
    bannerImageUrl: 'https://picsum.photos/seed/flux-bee-gees-alive-anapolis/1200/630',
    capacityTarget: 1500,
  });
  assert.equal(result.success, true);
});

test('MinimalTicketTypeInputSchema rejects negative price', () => {
  const result = MinimalTicketTypeInputSchema.safeParse({
    name: 'General',
    quantity: 100,
    basePrice: -50.0,
  });
  assert.equal(result.success, false);
});

test('TicketBatchSchema rejects invalid price or quantity', () => {
  const result = TicketBatchSchema.safeParse({
    name: 'Early Bird',
    price: -10,
    quantity: 0,
  });
  assert.equal(result.success, false);
});

test('mock payment provider capability is explicit about real gateway availability', () => {
  assert.equal(MockPaymentProviderCapability.provider, 'MOCK');
  assert.equal(MockPaymentProviderCapability.realGatewayAvailable, false);
  assert.deepEqual(MockPaymentProviderCapability.supportedMethods, ['pix', 'credit_card']);
});

test('mock payment scenarios include terminal and retryable outcomes', () => {
  assert.equal(MockPaymentScenarios.includes('approved'), true);
  assert.equal(MockPaymentScenarios.includes('temporary_failure'), true);
  assert.equal(MockPaymentScenarios.includes('failed'), true);
});

test('FinancialPaymentLedgerQuerySchema rejects invalid date range and status', () => {
  assert.equal(FinancialPaymentLedgerQuerySchema.safeParse({ dateFrom: '2026-07-02T00:00:00.000Z', dateTo: '2026-07-01T00:00:00.000Z' }).success, false);
  assert.equal(FinancialPaymentLedgerQuerySchema.safeParse({ status: 'PAID' }).success, false);
});

test('FinancialExportQuerySchema rejects invalid export scope filters', () => {
  assert.equal(FinancialExportQuerySchema.safeParse({ limit: 0 }).success, false);
  assert.equal(FinancialExportQuerySchema.safeParse({ dateFrom: '2026-07-02T00:00:00.000Z', dateTo: '2026-07-01T00:00:00.000Z' }).success, false);
});

import { InviteOrganizationMemberInputSchema, UpdateOrganizationProfileInputSchema } from './organization';
import { NoopAnalyticsProvider, PostHogAnalyticsProvider, safeCapture, sanitizeAnalyticsProperties } from './analytics';

test('InviteOrganizationMemberInputSchema rejects invalid email and role', () => {
  assert.equal(InviteOrganizationMemberInputSchema.safeParse({ email: 'bademail', role: 'EVENT_MANAGER' }).success, false);
  assert.equal(InviteOrganizationMemberInputSchema.safeParse({ email: 'test@org.com', role: 'SUPER_ADMIN' }).success, false);
  assert.equal(InviteOrganizationMemberInputSchema.safeParse({ email: 'test@org.com', role: 'ADMIN' }).success, true);
});

test('UpdateOrganizationProfileInputSchema rejects name shorter than 2 chars', () => {
  assert.equal(UpdateOrganizationProfileInputSchema.safeParse({ name: 'A' }).success, false);
  assert.equal(UpdateOrganizationProfileInputSchema.safeParse({ name: 'My Organization' }).success, true);
});

test('NoopAnalyticsProvider does not throw', async () => {
  const provider = new NoopAnalyticsProvider();
  await provider.capture({ event: 'checkout_started', properties: { eventId: 'event-1' } });
  await provider.identify('actor-1', { role: 'ADMIN' });
});

test('PostHogAnalyticsProvider captures sanitized event payload', async () => {
  let body: any = null;
  const provider = new PostHogAnalyticsProvider({
    apiKey: 'ph_test',
    host: 'https://posthog.example',
    fetchImpl: async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return new Response('{}', { status: 200 });
    },
  });

  await provider.capture({
    event: 'checkout_completed',
    distinctId: 'anon-1',
    properties: {
      eventId: 'event-1',
      amount: 120,
      currency: 'BRL',
      cpf: '00000000000',
      rawPayload: 'secret',
      email: 'buyer@example.com',
    },
  });

  assert.equal(body.event, 'checkout_completed');
  assert.equal(body.distinct_id, 'anon-1');
  assert.equal(body.properties.eventId, 'event-1');
  assert.equal(body.properties.amount, 120);
  assert.equal(body.properties.cpf, undefined);
  assert.equal(body.properties.rawPayload, undefined);
  assert.equal(body.properties.email, undefined);
});

test('safeCapture swallows provider failure', async () => {
  const provider = new PostHogAnalyticsProvider({
    apiKey: 'ph_test',
    fetchImpl: async () => new Response('{}', { status: 500 }),
  });

  await safeCapture(provider, { event: 'reservation_failed', properties: { requestId: 'req-1' } });
});

test('sanitizeAnalyticsProperties removes forbidden and unknown properties', () => {
  const result = sanitizeAnalyticsProperties({
    eventId: 'event-1',
    requestId: 'req-1',
    holderCpf: '000',
    qrPayload: 'raw',
    providerRawPayload: 'unknown',
  });

  assert.deepEqual(result, { eventId: 'event-1', requestId: 'req-1' });
});

import { parseRedisConfig } from './redis';

test('parseRedisConfig defaults to local host and port', () => {
  const config = parseRedisConfig('default', {});
  assert.equal(config.provider, 'local');
  assert.equal(config.options.host, 'localhost');
  assert.equal(config.options.port, 6379);
  assert.equal(config.options.tls, undefined);
});

test('parseRedisConfig parses REDIS_PROVIDER=upstash and configures TLS', () => {
  const config = parseRedisConfig('default', {
    REDIS_PROVIDER: 'upstash',
    REDIS_URL: 'redis://my-upstash.com:30000',
  });
  assert.equal(config.provider, 'upstash');
  assert.equal(config.url, 'rediss://my-upstash.com:30000');
  assert.deepEqual(config.options.tls, {});
});

test('parseRedisConfig supports queue-specific url overrides', () => {
  const config = parseRedisConfig('queue', {
    REDIS_URL: 'redis://default-redis:6379',
    QUEUE_REDIS_URL: 'redis://queue-redis:6379',
  });
  assert.equal(config.url, 'redis://queue-redis:6379');
});

