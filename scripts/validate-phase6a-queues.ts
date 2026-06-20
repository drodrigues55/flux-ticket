import { Worker } from 'bullmq';
import { prisma } from '@flux/database';
import { queues, deadLetterQueues, closeQueues, QUEUE_NAMES } from '../services/ticket-worker/src/queue-registry';
import { createRedisConnection } from '../services/ticket-worker/src/redis';

const connection = createRedisConnection();

async function drainQueue(name: string) {
  const queue = (queues as any)[name];
  const deadQueue = (deadLetterQueues as any)[name];
  await queue.drain(true);
  await deadQueue.drain(true);
  await queue.clean(0, 1000, 'completed').catch(() => undefined);
  await queue.clean(0, 1000, 'failed').catch(() => undefined);
  await queue.clean(0, 1000, 'delayed').catch(() => undefined);
  await deadQueue.clean(0, 1000, 'completed').catch(() => undefined);
  await deadQueue.clean(0, 1000, 'failed').catch(() => undefined);
}

async function waitForJobState(jobId: string, queueName: string, expected: string, timeoutMs = 10000) {
  const started = Date.now();
  let lastState = 'unknown';
  while (Date.now() - started < timeoutMs) {
    const job = await (queues as any)[queueName].getJob(jobId);
    const state = job ? await job.getState() : 'missing';
    lastState = state;
    if (state === expected) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const job = await (queues as any)[queueName].getJob(jobId);
  throw new Error(`job ${jobId} did not reach ${expected}, lastState=${lastState}, attempts=${job?.attemptsMade}, failedReason=${job?.failedReason}`);
}

async function runScenario(queueName: string, scenario: 'consume' | 'retry' | 'dead') {
  let attemptCount = 0;
  const worker = new Worker(
    queueName,
    async (job) => {
      attemptCount += 1;
      if (scenario === 'consume') return { ok: true };
      if (scenario === 'retry' && attemptCount < 2) throw new Error('transient');
      if (scenario === 'retry') return { ok: true };
      throw new Error('permanent');
    },
    { connection: connection as any }
  );
  worker.on('failed', async (job, err) => {
    if (!job || scenario !== 'dead' || job.attemptsMade < 2) return;
    await (deadLetterQueues as any)[queueName].add('phase6a.dead', {
      originalQueue: queueName,
      jobId: job.id,
      failureReason: err.message,
    });
  });
  await worker.waitUntilReady();

  try {
    const job = await (queues as any)[queueName].add(
      `phase6a-${queueName}-${scenario}`,
      { scenario },
      {
        attempts: scenario === 'dead' ? 2 : 2,
        backoff: { type: 'exponential', delay: 10 },
        removeOnComplete: false,
      }
    );

    if (scenario === 'consume') {
      await waitForJobState(job.id!, queueName, 'completed');
      return `${queueName}:consume:ok`;
    }

    if (scenario === 'retry') {
      await waitForJobState(job.id!, queueName, 'completed');
      if (attemptCount < 2) {
        throw new Error(`retry did not run twice, attempts=${attemptCount}`);
      }
      return `${queueName}:retry:ok`;
    }

    await waitForJobState(job.id!, queueName, 'failed');
    const started = Date.now();
    let deadJobs: any[] = [];
    while (Date.now() - started < 5000) {
      deadJobs = await (deadLetterQueues as any)[queueName].getJobs(['waiting', 'active', 'delayed', 'failed', 'completed'], 0, 20);
      if (deadJobs.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (deadJobs.length === 0) {
      throw new Error('dead-letter queue empty');
    }
    return `${queueName}:dead-letter:ok`;
  } finally {
    await worker.close();
  }
}

async function main() {
  const results = [];
  for (const queueName of [QUEUE_NAMES.paymentsRecoverPending, QUEUE_NAMES.cartsExpireAbandoned, QUEUE_NAMES.waitlistInvite] as const) {
    await drainQueue(queueName);
    results.push(await runScenario(queueName, 'consume'));
    results.push(await runScenario(queueName, 'retry'));
    results.push(await runScenario(queueName, 'dead'));
  }
  console.log(results.join('\n'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const queueName of [QUEUE_NAMES.paymentsRecoverPending, QUEUE_NAMES.cartsExpireAbandoned, QUEUE_NAMES.waitlistInvite] as const) {
      await drainQueue(queueName).catch(() => undefined);
    }
    await closeQueues().catch(() => undefined);
    await connection.quit().catch(() => undefined);
    await prisma.$disconnect();
  });
