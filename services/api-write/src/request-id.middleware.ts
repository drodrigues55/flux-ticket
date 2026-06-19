import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from './logger';
import { recordHttpMetric } from './observability';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    startTime?: number;
  }
}

function createRequestId() {
  return `req_${randomUUID()}`;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : createRequestId();
  req.requestId = requestId;
  req.startTime = Date.now();
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const route = req.route?.path || req.originalUrl?.split('?')[0] || req.url.split('?')[0];
    const latency = Date.now() - (req.startTime || Date.now());
    recordHttpMetric({ method: req.method, route, statusCode: res.statusCode, latency });
    logger.info({
      requestId,
      method: req.method,
      route,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latency,
      latencyMs: latency,
      userId: (req as any).user?.userId,
      organizerId: (req as any).user?.role === 'ORGANIZER' ? (req as any).user?.userId : undefined,
      role: (req as any).user?.role,
    }, 'request completed');
  });

  next();
}
