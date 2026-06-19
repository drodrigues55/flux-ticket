import type {
  BatchInfo,
  DashboardAlert,
  DashboardAttentionEvent,
  DashboardHealthyEvent,
  DashboardHeroEvent,
  DashboardOverviewResponse,
  TicketSaleRecord,
} from '@flux/types';

export type DashboardSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type DashboardEventMetrics = {
  eventId: string;
  title: string;
  imageUrl: string | null;
  date: string;
  venue: string;
  status: string;
  grossRevenue: number;
  ticketsSold: number;
  averageTicket: number;
  totalCapacity: number;
  occupancyPct: number;
  checkIns: number;
  daysRemaining: number;
  priorityScore: number;
  salesTrend7d: number;
  batches: BatchInfo[];
  activeAlerts: DashboardAlert[];
};

export type DashboardPriorityEvent = DashboardHeroEvent & {
  averageTicket: number;
  checkIns: number;
};

export type DashboardEventPriority = DashboardAttentionEvent | DashboardHealthyEvent | DashboardPriorityEvent;

export type LotPerformance = BatchInfo & {
  grossRevenue: number;
  averageTicket: number;
  checkIns: number;
};

export type DashboardAlertsResponse = {
  alerts: DashboardAlert[];
};

export type DashboardOverview = Omit<DashboardOverviewResponse, 'checkoutLimit' | 'salesPaused'> & {
  checkoutLimit: number | null;
  salesPaused: boolean | null;
  operationalControls: {
    checkoutLimit: {
      value: number | null;
      source: 'unavailable';
      status: 'not_configured';
    };
    salesPaused: {
      value: boolean | null;
      source: 'unavailable';
      status: 'not_configured';
    };
  };
  totals: {
    grossRevenue: number;
    ticketsSold: number;
    averageTicket: number;
    occupancyPct: number;
    checkIns: number;
  };
  recentSalesSummary: TicketSaleRecord[];
};
