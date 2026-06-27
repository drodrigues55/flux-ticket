import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEventDateRange, validateTicketConfiguration } from './event-creation-validation';

test('accepts a valid event date range', () => {
  assert.doesNotThrow(() => validateEventDateRange('2026-08-01T20:00:00.000Z', '2026-08-01T23:00:00.000Z'));
});

test('rejects missing startAt', () => {
  assert.throws(() => validateEventDateRange(undefined, undefined), /startAt is required/);
});

test('rejects endAt before startAt', () => {
  assert.throws(
    () => validateEventDateRange('2026-08-01T20:00:00.000Z', '2026-08-01T19:00:00.000Z'),
    /endAt must be after startAt/
  );
});

test('accepts a valid minimal ticket configuration', () => {
  assert.doesNotThrow(() => validateTicketConfiguration(
    {
      quantity: 100,
      basePrice: 0,
      salesStart: '2026-07-01T12:00:00.000Z',
      salesEnd: '2026-08-01T18:00:00.000Z',
    },
    { date: new Date('2026-08-01T20:00:00.000Z'), endDate: new Date('2026-08-01T23:00:00.000Z') }
  ));
});

test('rejects invalid minimal ticket quantity and price', () => {
  assert.throws(
    () => validateTicketConfiguration({ quantity: 0, basePrice: 10 }, { date: new Date('2026-08-01T20:00:00.000Z'), endDate: null }),
    /Ticket quantity must be greater than zero/
  );
  assert.throws(
    () => validateTicketConfiguration({ quantity: 10, basePrice: -1 }, { date: new Date('2026-08-01T20:00:00.000Z'), endDate: null }),
    /Ticket price must be zero or greater/
  );
});

test('rejects invalid sales windows', () => {
  const event = { date: new Date('2026-08-01T20:00:00.000Z'), endDate: new Date('2026-08-01T23:00:00.000Z') };
  assert.throws(
    () => validateTicketConfiguration({ quantity: 10, basePrice: 10, salesStart: '2026-08-01T21:00:00.000Z' }, event),
    /Ticket sales start must not be after event start/
  );
  assert.throws(
    () => validateTicketConfiguration({ quantity: 10, basePrice: 10, salesStart: '2026-07-01T12:00:00.000Z', salesEnd: '2026-07-01T11:00:00.000Z' }, event),
    /Ticket sales end must be after ticket sales start/
  );
  assert.throws(
    () => validateTicketConfiguration({ quantity: 10, basePrice: 10, salesEnd: '2026-08-02T00:00:00.000Z' }, event),
    /Ticket sales end must not be after event end/
  );
});
