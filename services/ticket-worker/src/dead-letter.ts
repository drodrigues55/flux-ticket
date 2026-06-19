import { Job } from 'bullmq';
import { QueueName, deadLetterQueues } from './queue-registry';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /(authorization|token|secret|password|cpf|card|cvc|cvv|hmac|signature|rawbody|rawpayload|rawresponse)/i;

export function sanitizePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizePayload(nested),
      ])
    );
  }

  return value;
}

export async function moveJobToDeadLetter(queueName: QueueName, job: Job | undefined, err: Error) {
  if (!job) return;

  await deadLetterQueues[queueName].add(
    `${job.name}.dead`,
    {
      originalQueue: queueName,
      jobName: job.name,
      jobId: job.id,
      data: sanitizePayload(job.data),
      failureReason: err.message,
      attempts: job.attemptsMade,
      requestId: job.data?.requestId ?? null,
      failedAt: new Date().toISOString(),
    },
    {
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
}
