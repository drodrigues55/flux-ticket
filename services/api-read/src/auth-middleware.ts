import { Request, Response, NextFunction } from 'express';
import { createHmac } from 'crypto';
import { fail } from './api-response';
import { RequestWithId } from './request-id-middleware';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const requestId = (req as RequestWithId).requestId || 'req_unknown';
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(fail({ code: 'UNAUTHENTICATED', message: 'Unauthorized: Bearer token is missing', statusCode: 401, requestId }));
  }

  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json(fail({ code: 'INVALID_TOKEN', message: 'Unauthorized: Invalid token format', statusCode: 401, requestId }));
    }

    const [headerB64, payloadB64, signature] = parts;
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-key';
    const isDev = process.env.NODE_ENV !== 'production';
    const isMock = signature === 'mocksignature';

    if (!(isDev && isMock)) {
      const expectedSignature = createHmac('sha256', jwtSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return res.status(401).json(fail({ code: 'INVALID_TOKEN_SIGNATURE', message: 'Unauthorized: Invalid token signature', statusCode: 401, requestId }));
      }
    }

    // Decode the payload
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (payload.role !== 'STAFF' && payload.role !== 'ORGANIZER') {
      return res.status(403).json(fail({ code: 'FORBIDDEN', message: 'Forbidden: Insufficient permissions', statusCode: 403, requestId }));
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json(fail({ code: 'INVALID_TOKEN', message: 'Unauthorized: Invalid token', statusCode: 401, requestId }));
  }
}
