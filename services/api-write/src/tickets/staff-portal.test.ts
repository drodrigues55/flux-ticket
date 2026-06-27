import test from 'node:test';
import assert from 'node:assert/strict';

// Core gate staff validation rules extracted for unit testing
function validateGateCheckin(
  ticket: any,
  scannedSignature: string,
  event: any,
  alreadyCheckedInTicketIds: Set<string>,
  allowedSectors: number[]
): { allowed: boolean; code: string; message: string } {
  if (ticket.eventId !== event.id) {
    return { allowed: false, code: 'WRONG_EVENT', message: 'Ingresso pertence a outro evento.' };
  }
  if (ticket.signature !== scannedSignature) {
    return { allowed: false, code: 'INVALID_SIGNATURE', message: 'Assinatura inválida! Possível adulteração.' };
  }
  if (allowedSectors.length > 0 && (!ticket.sectorId || !allowedSectors.includes(ticket.sectorId))) {
    return { allowed: false, code: 'UNAUTHORIZED_SECTOR', message: 'Setor não autorizado para esta portaria.' };
  }
  if (alreadyCheckedInTicketIds.has(ticket.id)) {
    return { allowed: false, code: 'ALREADY_USED', message: 'Ingresso já utilizado! Entrada duplicada bloqueada.' };
  }
  return { allowed: true, code: 'OK', message: 'Acesso Liberado!' };
}

// Test cases
test('rejects wrong-event ticket check-in', () => {
  const event = { id: 'evt-1' };
  const ticket = { id: 't-1', eventId: 'evt-2', signature: 'sig-abc' };
  const checkedIn = new Set<string>();

  const res = validateGateCheckin(ticket, 'sig-abc', event, checkedIn, []);
  assert.equal(res.allowed, false);
  assert.equal(res.code, 'WRONG_EVENT');
});

test('rejects check-in with invalid/tampered signature', () => {
  const event = { id: 'evt-1' };
  const ticket = { id: 't-1', eventId: 'evt-1', signature: 'sig-original' };
  const checkedIn = new Set<string>();

  const res = validateGateCheckin(ticket, 'sig-tampered', event, checkedIn, []);
  assert.equal(res.allowed, false);
  assert.equal(res.code, 'INVALID_SIGNATURE');
});

test('rejects duplicate check-in (already checked in)', () => {
  const event = { id: 'evt-1' };
  const ticket = { id: 't-1', eventId: 'evt-1', signature: 'sig-abc' };
  const checkedIn = new Set<string>(['t-1']);

  const res = validateGateCheckin(ticket, 'sig-abc', event, checkedIn, []);
  assert.equal(res.allowed, false);
  assert.equal(res.code, 'ALREADY_USED');
});

test('restricts check-in to device policy allowed sectors', () => {
  const event = { id: 'evt-1' };
  const ticket = { id: 't-1', eventId: 'evt-1', signature: 'sig-abc', sectorId: 3 };
  const checkedIn = new Set<string>();

  const res = validateGateCheckin(ticket, 'sig-abc', event, checkedIn, [1, 2]);
  assert.equal(res.allowed, false);
  assert.equal(res.code, 'UNAUTHORIZED_SECTOR');
});

test('allows valid check-in', () => {
  const event = { id: 'evt-1' };
  const ticket = { id: 't-1', eventId: 'evt-1', signature: 'sig-abc', sectorId: 1 };
  const checkedIn = new Set<string>();

  const res = validateGateCheckin(ticket, 'sig-abc', event, checkedIn, [1, 2]);
  assert.equal(res.allowed, true);
  assert.equal(res.code, 'OK');
});
