import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  DashboardAlertsResponse,
  DashboardBundle,
  DashboardEventPriority,
  DashboardOverview,
  DashboardPriorityEvent,
  DashboardServiceError,
  LotPerformance,
} from '../types/dashboard';

async function requestDashboard<T>(path: string): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/dashboard/${path}`);
  const json = await response.json() as ApiEnvelope<T> | ApiErrorEnvelope;

  if (!response.ok || 'error' in json) {
    const error = new Error(
      'error' in json ? String(json.error.message) : 'Dashboard request failed'
    ) as DashboardServiceError;
    if ('error' in json) {
      error.code = json.error.code;
      error.statusCode = json.error.statusCode;
      error.requestId = json.error.requestId;
      error.details = json.error.details;
    } else {
      error.statusCode = response.status;
    }
    throw error;
  }

  return json;
}

export async function getLotPerformance(eventId: string): Promise<ApiEnvelope<LotPerformance[]>> {
  return requestDashboard<LotPerformance[]>(`events/${eventId}/lots-performance`);
}

export async function getDashboardBundle(): Promise<DashboardBundle> {
  const overviewEnvelope = await requestDashboard<DashboardOverview>('overview');
  const priorityEnvelope = await requestDashboard<DashboardPriorityEvent | null>('priority-event');
  const eventsPriorityEnvelope = await requestDashboard<DashboardEventPriority[]>('events-priority');
  const alertsResult = await requestDashboard<DashboardAlertsResponse>('alerts')
    .then((envelope) => ({ ok: true as const, envelope }))
    .catch((error: DashboardServiceError) => ({ ok: false as const, error }));

  const eventId = priorityEnvelope.data?.eventId || overviewEnvelope.data.heroEvent?.eventId;
  const lotsEnvelope = eventId
    ? await getLotPerformance(eventId)
    : null;

  return {
    overview: overviewEnvelope.data,
    priorityEvent: priorityEnvelope.data,
    eventsPriority: eventsPriorityEnvelope.data,
    lotsPerformance: lotsEnvelope?.data ?? [],
    alerts: alertsResult.ok ? alertsResult.envelope.data.alerts : [],
    requestIds: {
      overview: overviewEnvelope.meta.requestId,
      priorityEvent: priorityEnvelope.meta.requestId,
      eventsPriority: eventsPriorityEnvelope.meta.requestId,
      lotsPerformance: lotsEnvelope?.meta.requestId ?? '',
      alerts: alertsResult.ok ? alertsResult.envelope.meta.requestId : alertsResult.error.requestId ?? '',
    },
    sectionErrors: alertsResult.ok ? {} : { alerts: alertsResult.error },
  };
}
