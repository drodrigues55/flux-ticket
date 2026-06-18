import { createHmac } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'client-dev-jwt-secret-key-12345';

export function signToken(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const toBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64url');

  const encodedHeader = toBase64Url(header);
  const encodedPayload = toBase64Url(payload);
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;

  const expectedSignature = createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}
