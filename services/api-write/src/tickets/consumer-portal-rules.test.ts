import test from 'node:test';
import assert from 'node:assert/strict';

// Core consumer validation rules extracted for unit testing
function validateReservation(event: any, batch: any, ticketType: any, quantity: number, now: Date): { isValid: boolean; error?: string } {
  if (event.status !== 'PUBLISHED') {
    return { isValid: false, error: 'O evento não está publicado.' };
  }
  if (!batch || batch.archivedAt || !batch.isActive) {
    return { isValid: false, error: 'Lote inválido, inativo ou arquivado.' };
  }
  if (batch.salesStart && batch.salesStart > now) {
    return { isValid: false, error: 'Vendas do lote ainda não iniciadas.' };
  }
  if (batch.salesEnd && batch.salesEnd < now) {
    return { isValid: false, error: 'Vendas do lote já encerradas.' };
  }
  if (!ticketType || ticketType.archivedAt || !ticketType.isActive || !ticketType.visibility) {
    return { isValid: false, error: 'Tipo de ingresso associado é inválido, inativo ou arquivado.' };
  }
  if (quantity > ticketType.purchaseLimit) {
    return { isValid: false, error: `A quantidade desejada excede o limite de compra de ${ticketType.purchaseLimit} ingressos por transação.` };
  }
  if (quantity > batch.availableQuantity) {
    return { isValid: false, error: 'Quantidade indisponível no lote.' };
  }
  return { isValid: true };
}

// Test cases
test('rejects reservation for unpublished event (draft/archived)', () => {
  const event = { id: 'evt-1', status: 'DRAFT' };
  const batch = { id: 'b-1', isActive: true, availableQuantity: 10 };
  const tt = { id: 'tt-1', isActive: true, visibility: true, purchaseLimit: 5 };
  
  const res = validateReservation(event, batch, tt, 2, new Date());
  assert.equal(res.isValid, false);
  assert.equal(res.error, 'O evento não está publicado.');
});

test('rejects reservation for inactive or archived batch', () => {
  const event = { id: 'evt-1', status: 'PUBLISHED' };
  const batch = { id: 'b-1', isActive: false, availableQuantity: 10 };
  const tt = { id: 'tt-1', isActive: true, visibility: true, purchaseLimit: 5 };

  const res = validateReservation(event, batch, tt, 2, new Date());
  assert.equal(res.isValid, false);
  assert.equal(res.error, 'Lote inválido, inativo ou arquivado.');
});

test('rejects reservation outside sales window (future sales)', () => {
  const event = { id: 'evt-1', status: 'PUBLISHED' };
  const now = new Date('2026-06-27T10:00:00Z');
  const batch = {
    id: 'b-1',
    isActive: true,
    availableQuantity: 10,
    salesStart: new Date('2026-06-27T12:00:00Z')
  };
  const tt = { id: 'tt-1', isActive: true, visibility: true, purchaseLimit: 5 };

  const res = validateReservation(event, batch, tt, 2, now);
  assert.equal(res.isValid, false);
  assert.equal(res.error, 'Vendas do lote ainda não iniciadas.');
});

test('rejects reservation outside sales window (past sales)', () => {
  const event = { id: 'evt-1', status: 'PUBLISHED' };
  const now = new Date('2026-06-27T15:00:00Z');
  const batch = {
    id: 'b-1',
    isActive: true,
    availableQuantity: 10,
    salesEnd: new Date('2026-06-27T12:00:00Z')
  };
  const tt = { id: 'tt-1', isActive: true, visibility: true, purchaseLimit: 5 };

  const res = validateReservation(event, batch, tt, 2, now);
  assert.equal(res.isValid, false);
  assert.equal(res.error, 'Vendas do lote já encerradas.');
});

test('rejects reservation above ticket type purchase limit', () => {
  const event = { id: 'evt-1', status: 'PUBLISHED' };
  const batch = { id: 'b-1', isActive: true, availableQuantity: 10 };
  const tt = { id: 'tt-1', isActive: true, visibility: true, purchaseLimit: 3 };

  const res = validateReservation(event, batch, tt, 4, new Date());
  assert.equal(res.isValid, false);
  assert.ok(res.error?.includes('excede o limite de compra'));
});

test('rejects reservation above available batch inventory', () => {
  const event = { id: 'evt-1', status: 'PUBLISHED' };
  const batch = { id: 'b-1', isActive: true, availableQuantity: 2 };
  const tt = { id: 'tt-1', isActive: true, visibility: true, purchaseLimit: 5 };

  const res = validateReservation(event, batch, tt, 3, new Date());
  assert.equal(res.isValid, false);
  assert.equal(res.error, 'Quantidade indisponível no lote.');
});

test('accepts valid reservation request', () => {
  const event = { id: 'evt-1', status: 'PUBLISHED' };
  const batch = { id: 'b-1', isActive: true, availableQuantity: 10 };
  const tt = { id: 'tt-1', isActive: true, visibility: true, purchaseLimit: 5 };

  const res = validateReservation(event, batch, tt, 2, new Date());
  assert.equal(res.isValid, true);
});
