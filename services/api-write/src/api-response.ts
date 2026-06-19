export interface ApiMeta {
  requestId: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string | object;
    statusCode: number;
    requestId: string;
    details?: unknown;
  };
  // Temporary compatibility mirrors for existing clients/proxies.
  statusCode: number;
  code: string;
  message: string | object;
  requestId: string;
  details?: unknown;
}

export function ok<T>(data: T, requestId: string): ApiSuccess<T> {
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
}): ApiErrorBody {
  const body: ApiErrorBody = {
    error: {
      code: params.code,
      message: params.message,
      statusCode: params.statusCode,
      requestId: params.requestId,
      ...(params.details !== undefined ? { details: params.details } : {}),
    },
    statusCode: params.statusCode,
    code: params.code,
    message: params.message,
    requestId: params.requestId,
    ...(params.details !== undefined ? { details: params.details } : {}),
  };
  return body;
}
