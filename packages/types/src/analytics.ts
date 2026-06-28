export type AnalyticsEventName =
  | 'public_event_list_viewed'
  | 'public_event_viewed'
  | 'ticket_selected'
  | 'reservation_created'
  | 'reservation_failed'
  | 'checkout_started'
  | 'checkout_failed'
  | 'checkout_completed'
  | 'mock_payment_approved'
  | 'ticket_page_viewed'
  | 'ticket_resend_requested'
  | 'dashboard_opened'
  | 'event_created'
  | 'event_creation_failed'
  | 'event_published'
  | 'publishing_blocked'
  | 'ticket_type_created'
  | 'batch_created'
  | 'finance_center_opened'
  | 'organization_member_invited'
  | 'role_changed'
  | 'staff_pwa_opened'
  | 'staff_event_selected'
  | 'offline_bundle_loaded'
  | 'qr_validation_success'
  | 'qr_validation_rejected'
  | 'offline_checkin_queued'
  | 'offline_sync_started'
  | 'offline_sync_completed'
  | 'offline_sync_conflict';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsCaptureInput = {
  event: AnalyticsEventName;
  distinctId?: string;
  properties?: AnalyticsProperties;
};

export interface AnalyticsProvider {
  name: 'noop' | 'posthog';
  identify(distinctId: string, properties?: AnalyticsProperties): Promise<void>;
  capture(input: AnalyticsCaptureInput): Promise<void>;
  capturePageView(path: string, properties?: AnalyticsProperties): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

export const FORBIDDEN_ANALYTICS_PROPERTIES = [
  'cpf',
  'buyerCpf',
  'holderCpf',
  'qr',
  'qrPayload',
  'payload',
  'rawPayload',
  'rawResponse',
  'signature',
  'hmacSignature',
  'token',
  'inviteToken',
  'cardNumber',
  'cvv',
  'fullName',
  'name',
  'email',
] as const;

export const ALLOWED_ANALYTICS_PROPERTIES = [
  'amount',
  'batchId',
  'blockerCount',
  'currency',
  'eventId',
  'eventSlug',
  'organizationId',
  'operatorId',
  'provider',
  'reason',
  'requestId',
  'role',
  'status',
  'syncCount',
  'ticketTypeId',
  'validationResult',
] as const;

const allowed = new Set<string>(ALLOWED_ANALYTICS_PROPERTIES);
const forbidden = new Set<string>(FORBIDDEN_ANALYTICS_PROPERTIES);

export function sanitizeAnalyticsProperties(input: AnalyticsProperties = {}): AnalyticsProperties {
  const output: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(input)) {
    if (forbidden.has(key) || !allowed.has(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
      output[key] = value;
    }
  }
  return output;
}

export class NoopAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'noop' as const;
  async identify(distinctId: string, properties?: AnalyticsProperties) {}
  async capture(input: AnalyticsCaptureInput) {}
  async capturePageView(path: string, properties?: AnalyticsProperties) {}
  async flush() {}
  async shutdown() {}
}

export type PostHogAnalyticsProviderConfig = {
  apiKey?: string;
  host?: string;
  fetchImpl?: typeof fetch;
  defaultDistinctId?: string;
};

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'posthog' as const;
  private readonly apiKey: string;
  private readonly host: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultDistinctId: string;

  constructor(config: PostHogAnalyticsProviderConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.host = (config.host || 'https://app.posthog.com').replace(/\/$/, '');
    this.fetchImpl = config.fetchImpl || fetch;
    this.defaultDistinctId = config.defaultDistinctId || 'anonymous';
    if (!this.apiKey) {
      throw new Error('PostHog analytics provider missing required config: POSTHOG_API_KEY or NEXT_PUBLIC_POSTHOG_KEY');
    }
  }

  async identify(distinctId: string, properties: AnalyticsProperties = {}) {
    await this.post('/capture/', {
      event: '$identify',
      distinct_id: distinctId,
      properties: sanitizeAnalyticsProperties(properties),
    });
  }

  async capture(input: AnalyticsCaptureInput) {
    await this.post('/capture/', {
      event: input.event,
      distinct_id: input.distinctId || this.defaultDistinctId,
      properties: sanitizeAnalyticsProperties(input.properties),
    });
  }

  async capturePageView(path: string, properties: AnalyticsProperties = {}) {
    await this.capture({ event: 'dashboard_opened', properties: { ...properties, status: path } });
  }

  async flush() {}
  async shutdown() {}

  private async post(path: string, body: Record<string, unknown>) {
    const response = await this.fetchImpl(`${this.host}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey, ...body }),
    });
    if (!response.ok) {
      throw new Error(`PostHog request failed with status ${response.status}`);
    }
  }
}

export function createAnalyticsProvider(config: PostHogAnalyticsProviderConfig & { provider?: string; nodeEnv?: string; appEnv?: string } = {}) {
  const provider = (config.provider || 'noop').toLowerCase();
  const nodeEnv = config.nodeEnv || process.env.NODE_ENV;
  if (nodeEnv === 'test' || provider === 'noop') return new NoopAnalyticsProvider();
  if (provider === 'posthog') {
    if (!config.apiKey) return new NoopAnalyticsProvider();
    return new PostHogAnalyticsProvider(config);
  }
  return new NoopAnalyticsProvider();
}

export async function safeCapture(provider: AnalyticsProvider, input: AnalyticsCaptureInput) {
  try {
    await provider.capture(input);
  } catch {
    // Product analytics must never break business flows.
  }
}
