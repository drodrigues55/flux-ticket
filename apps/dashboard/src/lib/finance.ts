export type ApiError = { message: string; requestId?: string };

export async function readEnvelope<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    const error = json.error || {};
    throw { message: error.message || json.message || 'Request failed.', requestId: error.requestId || json.requestId } satisfies ApiError;
  }
  return json.data as T;
}

export function buildPaymentLedgerQuery(params: {
  status?: string;
  eventId?: string;
  provider?: string;
  page: number;
  limit: number;
  sort: string;
  direction: string;
}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.eventId) query.set('eventId', params.eventId);
  if (params.provider) query.set('provider', params.provider);
  query.set('page', String(params.page));
  query.set('limit', String(params.limit));
  query.set('sort', params.sort);
  query.set('direction', params.direction);
  return query.toString();
}

export function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function financeExportUrl(path: string) {
  return `/api/organizer/finance/${path.replace(/^\/+/, '')}`;
}
