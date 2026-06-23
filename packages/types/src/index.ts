/**
 * @flux/types — Canonical domain dictionary for the Flux Tickets platform.
 *
 * This is the single source of truth for all shared interfaces, enums, and
 * API response contracts consumed by:
 *   - apps/client        (consumer sale pages)
 *   - apps/dashboard     (organizer dashboard)
 *   - services/api-write (NestJS write service)
 *   - services/api-read  (Express read/catalog service)
 *
 * NAMING RULES (enforced across all apps):
 *   - Ticket lot/category  → "batch" / "batchId"    (never "lote" or "lot")
 *   - Person who paid      → "buyer" / "buyerId"
 *   - Person who attends   → "holder" / "holderName"
 *   - Event show           → "event" / "eventId"    (never "show" in code)
 *   - Occupancy metric     → "occupancyPct"          (always 0–100 number)
 *   - Revenue              → "grossRevenue"           (always BRL decimal)
 *   - Ticket price         → "price"                 (BRL decimal, NOT cents)
 *   - Event cover photo    → "imageUrl"              (string | null)
 */

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export type TicketStatus =
  | 'PENDING_VALIDATION'
  | 'PENDING_PAYMENT'
  | 'VALID'
  | 'REVOKED'
  | 'CONSUMED';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SALES_OPEN' | 'LIVE' | 'FINISHED' | 'ARCHIVED' | 'CANCELLED';

export type SalesChannel = 'ONLINE' | 'POS' | 'COMPLIMENTARY';

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';

export type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'FAILED';

export type WaitlistStatus = 'WAITING' | 'INVITED' | 'RESERVED' | 'EXPIRED' | 'CANCELLED';

export type AlertType =
  | 'LOW_STOCK'
  | 'SLOW_SALES'
  | 'FAST_SALES'
  | 'CHECKIN_ISSUE'
  | 'REFUND_SPIKE'
  | 'MISSING_ASSET'
  | 'FINANCIAL_ISSUE';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type PayoutStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SETTLED'
  | 'FAILED';

// ─────────────────────────────────────────────
// CORE DOMAIN ENTITIES (API contract shapes)
// ─────────────────────────────────────────────

/** A ticket batch (lot) as returned by the API. Always includes computed fields. */
export interface BatchInfo {
  id: string;
  eventId: string;
  name: string;
  price: number;          // BRL decimal (e.g. 120.00)
  totalQuantity: number;
  availableQuantity: number;
  soldQuantity: number;   // computed: totalQuantity - availableQuantity
  occupancyPct: number;   // computed: soldQuantity / totalQuantity * 100
  sectorId: number | null;
  sectorName: string | null;
  meiaEntrada: boolean;
  isActive: boolean;
  status: string;
}

export interface TicketTypeInfo {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  visibility: boolean;
  transferable: boolean;
  refundable: boolean;
  purchaseLimit: number;
  isActive: boolean;
  batches: BatchInfo[];
}

/** Lightweight event summary for lists and dropdowns. */
export interface EventSummary {
  id: string;
  title: string;
  slug: string | null;
  date: string;            // ISO 8601 string
  location: string;        // full address
  venue: string | null;    // display name
  imageUrl: string | null;
  status: EventStatus;
  organizerId: string;
  categoryId: number | null;
}

/** Full event detail including batches. Used by sale page and event manager. */
export interface EventDetail extends EventSummary {
  description: string | null;
  tags: string[];
  capacityTarget: number | null;
  batches: BatchInfo[];
  ticketTypes: TicketTypeInfo[];
  // Aggregated fields computed server-side
  totalCapacity: number;
  totalSold: number;
  occupancyPct: number;
  grossRevenue: number;
}

/** A single ticket sale record. Used by dashboard Recent Sales and sale logs. */
export interface TicketSaleRecord {
  id: string;              // ticket ID
  eventId: string;
  eventTitle: string;
  batchId: string;
  batchName: string;
  buyerName: string;
  buyerEmail: string;
  holderName: string | null;
  price: number;
  status: TicketStatus;
  channel: SalesChannel;
  paymentMethod: PaymentMethod | null;
  createdAt: string;       // ISO 8601 string
  checkedInAt: string | null;
}

/** Payment record summary. */
export interface PaymentRecord {
  id: string;
  eventId: string;
  buyerName: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  installments: number;
  provider: string;
  providerPaymentId: string | null;
  paidAt: string | null;
}

export interface WaitlistEntryRecord {
  id: string;
  eventId: string;
  batchId: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: WaitlistStatus;
  position: number;
  expiresAt: string | null;
  invitedAt: string | null;
}

// ─────────────────────────────────────────────
// DASHBOARD API CONTRACTS
// ─────────────────────────────────────────────

/** An active operational alert for an event. */
export interface DashboardAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  suggestedAction: string | null;
  createdAt: string;
}

/** Upcoming scheduled payout for the organizer. */
export interface UpcomingPayout {
  id: string;
  amount: number;
  scheduledDate: string;
  eventTitle: string | null;
  status: PayoutStatus;
}

/**
 * Hero Event Card — Section 1 of the dashboard.
 * The single highest-priority event the organizer must act on now.
 */
export interface DashboardHeroEvent {
  eventId: string;
  title: string;
  imageUrl: string | null;
  date: string;
  venue: string;
  grossRevenue: number;
  ticketsSold: number;
  totalCapacity: number;
  occupancyPct: number;
  priorityScore: number;
  activeAlerts: DashboardAlert[];
  nextPayout: UpcomingPayout | null;
  salesTrend7d: number;    // % revenue change: last 7d vs previous 7d
  batches: BatchInfo[];
  daysRemaining: number;
}

/**
 * Attention Event Card — Section 2 of the dashboard.
 * Events that need monitoring but are not yet critical.
 */
export interface DashboardAttentionEvent {
  eventId: string;
  title: string;
  imageUrl: string | null;
  date: string;
  mainIssue: string;
  grossRevenue: number;
  occupancyPct: number;
  daysRemaining: number;
  priorityScore: number;
  activeAlerts: DashboardAlert[];
}

/**
 * Healthy Event Card — Section 3 of the dashboard.
 * Events operating normally. Minimal information only.
 */
export interface DashboardHealthyEvent {
  eventId: string;
  title: string;
  imageUrl: string | null;
  date: string;
  status: EventStatus;
  occupancyPct: number;
}

/**
 * Global Business KPIs — Section 4 of the dashboard.
 * Aggregated across all organizer events.
 */
export interface GlobalKpis {
  grossRevenue: number;
  ticketsSold: number;
  checkIns: number;
  avgOccupancyPct: number;
  upcomingPayouts: UpcomingPayout[];
}

/** A single data point for the sales history chart. */
export interface SalesDataPoint {
  date: string;            // formatted label (e.g. "16/06")
  revenue: number;
  tickets: number;
}

/**
 * Full dashboard overview response contract.
 * Every field is computed server-side. The frontend performs zero calculations.
 */
export interface DashboardOverviewResponse {
  // Sections ordered by priority (user rules)
  heroEvent: DashboardHeroEvent | null;
  attentionEvents: DashboardAttentionEvent[];
  healthyEvents: DashboardHealthyEvent[];
  globalKpis: GlobalKpis;
  salesHistory: SalesDataPoint[];  // last 30 days (from DailySalesSnapshot)
  recentSales: TicketSaleRecord[]; // last 12 entries (from SaleLog)
  batchPerformance: BatchInfo[];   // batches for hero event (or selected event)
  // Operational controls
  activeCheckoutLocks: number;
  checkoutLimit: number;
  salesPaused: boolean;
}

// ─────────────────────────────────────────────
// SHARED UTILITY TYPES
// ─────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
}

/** Cart item shape used by client checkout flow. */
export interface CartItem {
  eventId: string;
  eventTitle: string;
  eventLocation: string;
  eventDate: string;
  eventImage: string;
  batchId: string;
  batchName: string;
  batchPrice: number;
  isHalfPrice: boolean;
  quantity: number;
}

/** Checkout reservation request. */
export interface ReserveRequest {
  eventId: string;
  items: Array<{
    batchId: string;
    price: number;
    isHalfPrice: boolean;
    quantity: number;
  }>;
}

/** Checkout reservation response. */
export interface ReserveResponse {
  ticketId: string;   // comma-separated if multiple
  userId: string;
}

export * from './cpf';
export * from './validation/common';
export * from './validation/event';
