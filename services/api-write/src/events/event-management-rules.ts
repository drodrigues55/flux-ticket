export function canDeleteEvent(input: {
  status: string;
  counts: {
    tickets: number;
    payments: number;
    reservations: number;
    orders: number;
    checkins: number;
    alerts: number;
  };
}) {
  if (input.status !== 'DRAFT') return false;
  return Object.values(input.counts).every((count) => count === 0);
}

export function canArchiveEvent(status: string) {
  return status !== 'ARCHIVED' && status !== 'CANCELLED';
}
