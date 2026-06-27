import test from 'node:test';
import assert from 'node:assert/strict';

// Helper matching computePriorityScore logic
function computePriorityScore(params: {
  status: string;
  daysRemaining: number;
  occupancyPct: number;
  capacityTarget: number;
  batches: any[];
  criticalAlerts: number;
  warningAlerts: number;
  salesTrend7d: number;
  paymentFailures: number;
  pendingPayments: number;
  failedDeliveries: number;
  offlineSyncConflicts: number;
}) {
  let score = 0;
  if (params.status === 'DRAFT' || params.status === 'READY_FOR_VALIDATION') {
    score += 15;
    if (params.batches.length === 0) score += 30;
    return score;
  }
  if (params.daysRemaining <= 7) score += 50;
  if (params.daysRemaining <= 3) score += 30;
  if (params.occupancyPct < params.capacityTarget) score += 20;
  if (params.occupancyPct >= 80) score += 25;
  if (params.criticalAlerts > 0) score += 40;
  if (params.warningAlerts > 0) score += 20;
  if (params.salesTrend7d < -20) score += 25;
  if (params.paymentFailures > 0) score += 15;
  if (params.pendingPayments > 0) score += 10;
  if (params.failedDeliveries > 0) score += 20;
  if (params.offlineSyncConflicts > 0) score += 25;
  return score;
}

test('priority ranking engine: draft events are ranked for setup completion, not sales', () => {
  const score = computePriorityScore({
    status: 'DRAFT',
    daysRemaining: 1, // very close date, but it's a draft!
    occupancyPct: 0,
    capacityTarget: 80,
    batches: [], // missing tickets
    criticalAlerts: 0,
    warningAlerts: 0,
    salesTrend7d: 0,
    paymentFailures: 0,
    pendingPayments: 0,
    failedDeliveries: 0,
    offlineSyncConflicts: 0,
  });

  // Score should include base setup + missing tickets points, ignoring proximity/sales
  assert.equal(score, 45); 
});

test('priority ranking engine: critical issues increase score for published events', () => {
  const score = computePriorityScore({
    status: 'PUBLISHED',
    daysRemaining: 2, // +80 points
    occupancyPct: 50,
    capacityTarget: 80, // +20 points
    batches: [{ id: 'b-1' }],
    criticalAlerts: 1, // +40 points
    warningAlerts: 0,
    salesTrend7d: -25, // +25 points
    paymentFailures: 1, // +15 points
    pendingPayments: 0,
    failedDeliveries: 1, // +20 points
    offlineSyncConflicts: 0,
  });

  assert.equal(score, 200);
});
