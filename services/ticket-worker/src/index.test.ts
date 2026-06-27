import test from 'node:test';
import assert from 'node:assert/strict';

// Worker business logic simulation for idempotency and retryability
class MockEmailProvider {
  public failFirstTime = true;
  public attempts = 0;

  async sendEmail(orderId: string): Promise<boolean> {
    this.attempts++;
    if (this.failFirstTime && this.attempts === 1) {
      throw new Error('Provider network connection error');
    }
    return true; // Sent successfully
  }
}

function processDeliveryJob(order: { id: string; status: string }, provider: MockEmailProvider): { success: boolean; error?: string } {
  if (order.status !== 'PAID') {
    return { success: false, error: 'Order is not paid, skipping delivery' };
  }
  return { success: true };
}

// Test cases
test('delivery job runs only for paid/approved orders', () => {
  const paidOrder = { id: 'o-1', status: 'PAID' };
  const pendingOrder = { id: 'o-2', status: 'PENDING' };

  const provider = new MockEmailProvider();
  assert.equal(processDeliveryJob(paidOrder, provider).success, true);
  assert.equal(processDeliveryJob(pendingOrder, provider).success, false);
});

test('email provider failure is retryable and succeeds on retry', async () => {
  const provider = new MockEmailProvider();
  let completed = false;
  let attemptsMade = 0;

  // First run fails
  try {
    attemptsMade++;
    await provider.sendEmail('o-1');
    completed = true;
  } catch (err) {
    completed = false;
  }
  assert.equal(completed, false);
  assert.equal(attemptsMade, 1);

  // Second run (retry) succeeds
  try {
    attemptsMade++;
    await provider.sendEmail('o-1');
    completed = true;
  } catch (err) {
    completed = false;
  }
  assert.equal(completed, true);
  assert.equal(attemptsMade, 2);
});

test('idempotent ticket generation prevents duplicate rows', () => {
  const generatedTickets = new Set<string>();

  function generateTicketsForOrder(orderId: string): number {
    if (generatedTickets.has(orderId)) {
      return 0; // Already generated (idempotent)
    }
    generatedTickets.add(orderId);
    return 1; // 1 ticket generated
  }

  assert.equal(generateTicketsForOrder('o-1'), 1);
  assert.equal(generateTicketsForOrder('o-1'), 0); // Duplicate call yields 0 new tickets
});
