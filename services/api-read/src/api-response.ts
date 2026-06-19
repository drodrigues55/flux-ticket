export function ok<T>(data: T, requestId: string) {
  return {
    data,
    meta: { requestId },
  };
}

export function fail(params: {
  code: string;
  message: string | object;
  statusCode: number;
  requestId: string;
  details?: unknown;
}) {
  return {
    error: {
      code: params.code,
      message: params.message,
      statusCode: params.statusCode,
      requestId: params.requestId,
      details: params.details ?? null,
    },
    // Temporary compatibility mirrors for existing clients/proxies.
    errorMessage: typeof params.message === 'string' ? params.message : undefined,
    statusCode: params.statusCode,
    code: params.code,
    message: params.message,
    requestId: params.requestId,
    details: params.details ?? null,
  };
}
