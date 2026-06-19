import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface RequestWithId extends Request {
  requestId?: string;
  startTime?: number;
}

function createRequestId() {
  return `req_${randomUUID()}`;
}

export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : createRequestId();
  req.requestId = requestId;
  req.startTime = Date.now();
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    logger.info({
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs: Date.now() - (req.startTime || Date.now()),
    }, 'request completed');
  });

  next();
}
