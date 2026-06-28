import { createAnalyticsProvider, safeCapture, type AnalyticsCaptureInput } from '@flux/types';

const provider = createAnalyticsProvider({
  provider: process.env.ANALYTICS_PROVIDER,
  apiKey: process.env.POSTHOG_API_KEY,
  host: process.env.POSTHOG_HOST,
  nodeEnv: process.env.NODE_ENV,
  appEnv: process.env.APP_ENV,
  defaultDistinctId: 'api-write',
});

export function track(input: AnalyticsCaptureInput) {
  return safeCapture(provider, input);
}
