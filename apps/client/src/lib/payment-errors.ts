export function extractPaymentRequestId(payload: any, fallback?: string | null): string | null {
  return payload?.error?.requestId || payload?.requestId || payload?.meta?.requestId || fallback || null;
}

export function formatPaymentError(payload: any, fallbackMessage = 'Falha ao processar o pagamento.'): string {
  const message = payload?.error?.message || payload?.message || payload?.errorMessage || fallbackMessage;
  const requestId = extractPaymentRequestId(payload);
  return requestId ? `${message} (requestId: ${requestId})` : message;
}
