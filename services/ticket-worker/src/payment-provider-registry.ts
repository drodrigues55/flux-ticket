import { MockPaymentProvider } from './mock-payment-provider';
import { PaymentProvider, TemporaryProviderFailure } from './payment-provider';

export function getPaymentProvider(provider: string): PaymentProvider {
  if (provider !== 'MOCK') {
    throw new TemporaryProviderFailure(`Provider ${provider} is not available in Phase 11`);
  }
  return new MockPaymentProvider();
}
