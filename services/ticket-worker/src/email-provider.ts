import { logger } from './logger';

export type EmailDeliveryPurpose =
  | 'transactional'
  | 'ticket'
  | 'purchase_confirmation'
  | 'organization_invite'
  | 'resend_ticket';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  purpose?: EmailDeliveryPurpose;
  metadata?: Record<string, unknown>;
};

export type EmailDeliveryResult = {
  status: 'SENT' | 'FAILED' | 'RETRYABLE';
  provider: 'mock' | 'resend';
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface EmailProvider {
  name: 'mock' | 'resend';
  sendTransactionalEmail(message: EmailMessage): Promise<EmailDeliveryResult>;
  sendTicketEmail(message: EmailMessage): Promise<EmailDeliveryResult>;
  sendPurchaseConfirmation(message: EmailMessage): Promise<EmailDeliveryResult>;
  sendOrganizationInvite(message: EmailMessage): Promise<EmailDeliveryResult>;
  sendResendTicketEmail(message: EmailMessage): Promise<EmailDeliveryResult>;
}

function cleanErrorMessage(value: unknown) {
  if (!value) return 'Email provider request failed.';
  return String(value).replace(/re_[A-Za-z0-9_-]+/g, 're_***');
}

export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock' as const;
  public readonly sent: EmailMessage[] = [];

  async sendTransactionalEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    this.sent.push(message);
    logger.info({ provider: this.name, to: message.to, purpose: message.purpose }, 'mock email accepted');
    return {
      status: 'SENT',
      provider: this.name,
      messageId: `mock_${Date.now()}_${this.sent.length}`,
    };
  }

  sendTicketEmail(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'ticket' });
  }

  sendPurchaseConfirmation(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'purchase_confirmation' });
  }

  sendOrganizationInvite(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'organization_invite' });
  }

  sendResendTicketEmail(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'resend_ticket' });
  }
}

export type ResendEmailProviderConfig = {
  apiKey?: string;
  from?: string;
  replyTo?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;
  private readonly apiKey: string;
  private readonly from: string;
  private readonly replyTo?: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ResendEmailProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.RESEND_API_KEY || '';
    this.from = config.from || process.env.EMAIL_FROM || '';
    this.replyTo = config.replyTo || process.env.EMAIL_REPLY_TO;
    this.endpoint = config.endpoint || 'https://api.resend.com/emails';
    this.fetchImpl = config.fetchImpl || fetch;

    const missing = [
      !this.apiKey ? 'RESEND_API_KEY' : null,
      !this.from ? 'EMAIL_FROM' : null,
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new Error(`Resend email provider missing required config: ${missing.join(', ')}`);
    }
  }

  async sendTransactionalEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo || this.replyTo,
        }),
      });

      const json: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        const status = response.status >= 500 || response.status === 429 ? 'RETRYABLE' : 'FAILED';
        logger.warn({
          provider: this.name,
          statusCode: response.status,
          purpose: message.purpose,
          errorCode: json?.name || json?.error || 'RESEND_ERROR',
        }, 'resend email request failed');
        return {
          status,
          provider: this.name,
          errorCode: json?.name || json?.error || 'RESEND_ERROR',
          errorMessage: cleanErrorMessage(json?.message || json?.error),
        };
      }

      return {
        status: 'SENT',
        provider: this.name,
        messageId: json?.id ? String(json.id) : undefined,
      };
    } catch (error: any) {
      logger.warn({ provider: this.name, purpose: message.purpose, error: cleanErrorMessage(error?.message) }, 'resend email network failure');
      return {
        status: 'RETRYABLE',
        provider: this.name,
        errorCode: 'RESEND_NETWORK_ERROR',
        errorMessage: cleanErrorMessage(error?.message),
      };
    }
  }

  sendTicketEmail(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'ticket' });
  }

  sendPurchaseConfirmation(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'purchase_confirmation' });
  }

  sendOrganizationInvite(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'organization_invite' });
  }

  sendResendTicketEmail(message: EmailMessage) {
    return this.sendTransactionalEmail({ ...message, purpose: message.purpose ?? 'resend_ticket' });
  }
}

export function getEmailProvider() {
  const provider = (process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === 'production' ? 'resend' : 'mock')).toLowerCase();
  if (provider === 'mock') return new MockEmailProvider();
  if (provider === 'resend') return new ResendEmailProvider();
  if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'staging') {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
  logger.warn({ provider }, 'unsupported email provider, falling back to mock in non-production');
  return new MockEmailProvider();
}
