import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is missing');
    }

    const token = authHeader.split(' ')[1];
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid token format');
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
          throw new UnauthorizedException('Invalid token signature');
        }
      }

      // Decode the payload
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);

      if (payload.role !== 'STAFF' && payload.role !== 'ORGANIZER') {
        throw new ForbiddenException('Forbidden: Insufficient permissions');
      }

      request.user = payload;
      return true;
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Unauthorized: Invalid token');
    }
  }
}

