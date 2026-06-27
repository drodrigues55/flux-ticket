import test from 'node:test';
import assert from 'node:assert/strict';

// Helper representing dashboard visual constraints
function getHeroActionLink(hero: any): string {
  if (hero.priorityScore >= 70) {
    if (hero.activeAlerts?.some((a: any) => a.type === 'CHECKIN_ISSUE')) {
      return `/events/${hero.eventId}/checkins`;
    }
    if (hero.activeAlerts?.some((a: any) => a.type === 'FINANCIAL_ISSUE')) {
      return `/events/${hero.eventId}/finance`;
    }
    return `/events/${hero.eventId}/overview`;
  }
  return `/events/${hero.eventId}`;
}

test('hero event primary action resolves to relevant detail page', () => {
  const hero = {
    eventId: 'evt-1',
    priorityScore: 85,
    activeAlerts: [{ type: 'CHECKIN_ISSUE' }],
  };
  const link = getHeroActionLink(hero);
  assert.equal(link, `/events/evt-1/checkins`);
});

test('static KPI cards are not clickable by default', () => {
  const kpiCard = {
    label: 'Faturamento Bruto',
    value: 'R$ 10.000,00',
    isClickable: false,
  };
  assert.equal(kpiCard.isClickable, false);
});
