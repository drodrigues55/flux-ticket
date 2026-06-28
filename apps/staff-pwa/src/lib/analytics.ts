import { createAnalyticsProvider, safeCapture, type AnalyticsCaptureInput } from '@flux/types';

const provider = createAnalyticsProvider({
  provider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || process.env.ANALYTICS_PROVIDER,
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_API_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST,
  nodeEnv: process.env.NODE_ENV,
  defaultDistinctId: 'staff-anonymous',
});

export function track(input: AnalyticsCaptureInput) {
  return safeCapture(provider, input);
}
