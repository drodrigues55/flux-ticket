import type {
  BatchInfo,
  DashboardAlert,
  DashboardAttentionEvent,
  DashboardHealthyEvent,
  DashboardHeroEvent,
  DashboardOverviewResponse,
  TicketSaleRecord,
} from '@flux/types';

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId: string;
  };
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    statusCode: number;
    requestId: string;
    details?: unknown;
  };
};

export type DashboardPriorityEvent = DashboardHeroEvent & {
  averageTicket?: number;
  checkIns?: number;
};

export type DashboardEventPriority =
  | DashboardPriorityEvent
  | DashboardAttentionEvent
  | DashboardHealthyEvent;

export type LotPerformance = BatchInfo & {
  grossRevenue: number;
  averageTicket: number;
  checkIns: number;
};

export type DashboardOverview = DashboardOverviewResponse & {
  totals?: {
    grossRevenue: number;
    ticketsSold: number;
    averageTicket: number;
    occupancyPct: number;
    checkIns: number;
  };
  recentSalesSummary?: TicketSaleRecord[];
};

export type DashboardAlertsResponse = {
  alerts: DashboardAlert[];
};

export type DashboardBundle = {
  overview: DashboardOverview;
  priorityEvent: DashboardPriorityEvent | null;
  eventsPriority: DashboardEventPriority[];
  lotsPerformance: LotPerformance[];
  alerts: DashboardAlert[];
  requestIds: Record<string, string>;
};

export type DashboardServiceError = Error & {
  code?: string;
  statusCode?: number;
  requestId?: string;
  details?: unknown;
};
