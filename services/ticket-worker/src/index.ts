import { closeQueues, ACTIVE_QUEUE_NAMES, SCAFFOLD_QUEUE_NAMES } from './queue-registry';
import { processOutbox } from './outbox-publisher';
import { closeWorkers, workers } from './workers';
import { logger } from './logger';
import { captureException, initSentry } from './sentry';
import { validateRuntimeEnv } from './env.validation';

const pollIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 5000);
const version = process.env.SERVICE_VERSION || process.env.npm_package_version || '1.0.0';

async function shutdown(exitCode = 0) {
  logger.info({ exitCode, version }, 'ticket-worker shutting down');
  await closeWorkers().catch((error) => {
    logger.error({ err: error }, 'failed to close workers');
    captureException(error, { service: 'ticket-worker', phase: 'shutdownWorkers' });
  });
  await closeQueues().catch((error) => {
    logger.error({ err: error }, 'failed to close queues');
    captureException(error, { service: 'ticket-worker', phase: 'shutdownQueues' });
  });
  process.exit(exitCode);
}

async function bootstrap() {
  validateRuntimeEnv();
  initSentry('ticket-worker');
  logger.info({
    version,
    commit: process.env.GIT_COMMIT || null,
    APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    activeQueues: ACTIVE_QUEUE_NAMES,
    scaffoldQueues: SCAFFOLD_QUEUE_NAMES,
    workerCount: workers.length,
  }, 'ticket-worker started');

  if (process.env.WORKER_RUN_ONCE === 'true') {
    await processOutbox();
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.WORKER_ONCE_WAIT_MS || 1500)));
    await shutdown(0);
    return;
  }

  setInterval(async () => {
    try {
      await processOutbox();
    } catch (error) {
      logger.error({ err: error }, 'outbox publisher loop failed');
      captureException(error, { service: 'ticket-worker', queueName: 'outbox.publisher' });
    }
  }, pollIntervalMs);
}

process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));

bootstrap().catch((error) => {
  logger.error({ err: error }, 'failed to start ticket-worker');
  captureException(error, { service: 'ticket-worker', phase: 'bootstrap' });
  void shutdown(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled rejection');
  captureException(reason, { service: 'ticket-worker', type: 'unhandledRejection' });
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'uncaught exception');
  captureException(error, { service: 'ticket-worker', type: 'uncaughtException' });
});
