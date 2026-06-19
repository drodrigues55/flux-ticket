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

export async function getDashboardBundle(): Promise<DashboardBundle> {
  const overviewEnvelope = await requestDashboard<DashboardOverview>('overview');
  const priorityEnvelope = await requestDashboard<DashboardPriorityEvent | null>('priority-event');
  const eventsPriorityEnvelope = await requestDashboard<DashboardEventPriority[]>('events-priority');
  const alertsEnvelope = await requestDashboard<DashboardAlertsResponse>('alerts');

  const eventId = priorityEnvelope.data?.eventId || overviewEnvelope.data.heroEvent?.eventId;
  const lotsEnvelope = eventId
    ? await requestDashboard<LotPerformance[]>(`events/${eventId}/lots-performance`)
    : null;

  return {
    overview: overviewEnvelope.data,
    priorityEvent: priorityEnvelope.data,
    eventsPriority: eventsPriorityEnvelope.data,
    lotsPerformance: lotsEnvelope?.data ?? [],
    alerts: alertsEnvelope.data.alerts,
    requestIds: {
      overview: overviewEnvelope.meta.requestId,
      priorityEvent: priorityEnvelope.meta.requestId,
      eventsPriority: eventsPriorityEnvelope.meta.requestId,
      lotsPerformance: lotsEnvelope?.meta.requestId ?? '',
      alerts: alertsEnvelope.meta.requestId,
    },
  };
}
