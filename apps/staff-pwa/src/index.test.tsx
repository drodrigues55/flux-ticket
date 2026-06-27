import test from 'node:test';
import assert from 'node:assert/strict';

// PWA gate validation simulation logic
function checkQRData(payload: string, currentEventId: string): { valid: boolean; code: string } {
  try {
    const data = JSON.parse(payload);
    if (!data.ticket_id || !data.signature) {
      return { valid: false, code: 'MALFORMED_QR' };
    }
    if (data.event_id !== currentEventId) {
      return { valid: false, code: 'WRONG_EVENT' };
    }
    return { valid: true, code: 'VALID' };
  } catch (err) {
    return { valid: false, code: 'MALFORMED_QR' };
  }
}

function processOfflineSync(mutations: any[]): { success: number; conflicts: number } {
  let success = 0;
  let conflicts = 0;
  
  const processed = new Set<string>();
  for (const m of mutations) {
    if (processed.has(m.ticketId)) {
      conflicts++;
    } else {
      processed.add(m.ticketId);
      success++;
    }
  }
  return { success, conflicts };
}

// Test cases
test('rejects malformed QR data payload', () => {
  const res = checkQRData('invalid-json', 'evt-1');
  assert.equal(res.valid, false);
  assert.equal(res.code, 'MALFORMED_QR');
});

test('rejects QR ticket representing a different event', () => {
  const qr = JSON.stringify({ ticket_id: 't-123', signature: 'sig-abc', event_id: 'evt-2' });
  const res = checkQRData(qr, 'evt-1');
  assert.equal(res.valid, false);
  assert.equal(res.code, 'WRONG_EVENT');
});

test('sync resolves offline mutations and flags duplicate ticket check-in conflicts', () => {
  const mutations = [
    { ticketId: 't-1' },
    { ticketId: 't-2' },
    { ticketId: 't-1' }, // Conflict: duplicate check-in
  ];
  const result = processOfflineSync(mutations);
  assert.equal(result.success, 2);
  assert.equal(result.conflicts, 1);
});
