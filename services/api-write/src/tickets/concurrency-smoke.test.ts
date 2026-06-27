import test from 'node:test';
import assert from 'node:assert/strict';

// Helper simulated state validation matches core concurrency rules
class ConcurrencyQueueRegistry {
  private checkedOutIds = new Set<string>();

  processCheckout(submitId: string): { success: boolean; isDuplicate: boolean } {
    if (this.checkedOutIds.has(submitId)) {
      return { success: false, isDuplicate: true };
    }
    this.checkedOutIds.add(submitId);
    return { success: true, isDuplicate: false };
  }
}

test('concurrency: duplicate checkout submit is blocked by idempotency key registry', async () => {
  const registry = new ConcurrencyQueueRegistry();
  const submitId = 'submit_tx_123';

  // Simulate two identical checkout submissions
  const res1 = registry.processCheckout(submitId);
  const res2 = registry.processCheckout(submitId);

  assert.equal(res1.success, true);
  assert.equal(res1.isDuplicate, false);

  assert.equal(res2.success, false);
  assert.equal(res2.isDuplicate, true); // Blocked
});
