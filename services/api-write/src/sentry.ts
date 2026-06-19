import { logger } from './logger';

let sentry: any = null;
let capturedForTest = 0;

export function initSentry(service: string) {
  if (!process.env.SENTRY_DSN) return;
  try {
    const runtimeRequire = eval('require');
    sentry = runtimeRequire('@sentry/node');
    sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      release: process.env.SERVICE_VERSION || process.env.GIT_COMMIT,
      initialScope: {
        tags: {
          service,
          APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
        },
      },
    });
  } catch {
    sentry = null;
  }
}

export function captureException(error: unknown, context: Record<string, unknown> = {}) {
  if (process.env.SENTRY_TEST_MODE === 'true') {
    capturedForTest += 1;
    logger.info({ sentryCaptured: true, capturedForTest, ...context }, 'sentry test capture');
  }
  if (!sentry) return;
  sentry.withScope((scope: any) => {
    for (const [key, value] of Object.entries(context)) {
      scope.setContext(key, typeof value === 'object' && value !== null ? value : { value });
    }
    sentry.captureException(error);
  });
}

export function getSentryTestCaptureCount() {
  return capturedForTest;
}
