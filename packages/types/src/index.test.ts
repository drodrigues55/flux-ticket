import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateEventInputSchema, MinimalTicketTypeInputSchema, TicketBatchSchema } from './validation/event';

test('CreateEventInputSchema rejects missing name and startAt', () => {
  const result = CreateEventInputSchema.safeParse({
    slug: 'my-event',
    timezone: 'UTC',
    locationType: 'PHYSICAL',
  });
  assert.equal(result.success, false);
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
