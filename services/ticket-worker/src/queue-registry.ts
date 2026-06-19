import { JobsOptions, Queue } from 'bullmq';
import { createRedisConnection } from './redis';

export const QUEUE_NAMES = {
  paymentsWebhook: 'payments.webhook',
  ticketsIssue: 'tickets.issue',
  halfPriceValidateDeadline: 'halfPrice.validateDeadline',
  checkinsSync: 'checkins.sync',
  analyticsAggregate: 'analytics.aggregate',
  ticketsEmail: 'tickets.email',
  walletGenerate: 'wallet.generate',
  refundsProcess: 'refunds.process',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ACTIVE_QUEUE_NAMES: QueueName[] = [
  QUEUE_NAMES.paymentsWebhook,
  QUEUE_NAMES.ticketsIssue,
  QUEUE_NAMES.halfPriceValidateDeadline,
  QUEUE_NAMES.checkinsSync,
  QUEUE_NAMES.analyticsAggregate,
];

export const SCAFFOLD_QUEUE_NAMES: QueueName[] = [
  QUEUE_NAMES.ticketsEmail,
  QUEUE_NAMES.walletGenerate,
  QUEUE_NAMES.refundsProcess,
];

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 1000,
  removeOnFail: false,
};

const connection = createRedisConnection();

const allQueueNames = [...ACTIVE_QUEUE_NAMES, ...SCAFFOLD_QUEUE_NAMES];

export const queues = Object.fromEntries(
  allQueueNames.map((name) => [
    name,
    new Queue(name, {
      connection: connection as any,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }),
  ])
) as Record<QueueName, Queue>;

export const deadLetterQueues = Object.fromEntries(
  allQueueNames.map((name) => [
    name,
    new Queue(`${name}.dead`, {
      connection: connection as any,
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),
  ])
) as Record<QueueName, Queue>;

export function resolveQueueForOutbox(type: string, payload: any): QueueName | null {
  if (type === QUEUE_NAMES.paymentsWebhook || type === 'PAYMENT_WEBHOOK_RECEIVED') {
    return QUEUE_NAMES.paymentsWebhook;
  }

  if (type === QUEUE_NAMES.ticketsIssue || type === 'TICKET_ISSUE_REQUESTED') {
    return QUEUE_NAMES.ticketsIssue;
  }

  if (type === QUEUE_NAMES.halfPriceValidateDeadline || type === 'HALF_PRICE_VALIDATE_DEADLINE') {
    return QUEUE_NAMES.halfPriceValidateDeadline;
  }

  if (type === QUEUE_NAMES.checkinsSync || type === 'CHECKINS_SYNC_REQUESTED') {
    return QUEUE_NAMES.checkinsSync;
  }

  if (type === QUEUE_NAMES.analyticsAggregate || type === 'ANALYTICS_AGGREGATE_REQUESTED') {
    return QUEUE_NAMES.analyticsAggregate;
  }

  if (type === 'TICKET_RESERVED' && payload?.isHalfPrice === true) {
    return QUEUE_NAMES.halfPriceValidateDeadline;
  }

  return null;
}

export async function closeQueues() {
  await Promise.all([
    ...Object.values(queues).map((queue) => queue.close()),
    ...Object.values(deadLetterQueues).map((queue) => queue.close()),
    connection.quit(),
  ]);
}
