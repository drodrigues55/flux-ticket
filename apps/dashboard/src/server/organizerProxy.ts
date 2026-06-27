import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

export function generateMockJWT(userId: string, role: string): string {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = { userId, role };
  const toBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  return `${toBase64Url(header)}.${toBase64Url(payload)}.mocksignature`;
}

export async function organizerToken() {
  const id = 'organizer-mock';
  const existing = await prisma.user.findFirst({
    where: { OR: [{ id }, { email: 'mock-organizer@flux.com' }] },
  });

  const organizer = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { role: 'ORGANIZER' } })
    : await prisma.user.create({
        data: {
          id,
          email: 'mock-organizer@flux.com',
          name: 'Mock Organizer',
          password: 'password123',
          role: 'ORGANIZER',
        },
      });

  return generateMockJWT(organizer.id, 'ORGANIZER');
}

export async function proxyJson(req: NextApiRequest, res: NextApiResponse, target: string, method: string) {
  try {
    const token = await organizerToken();
    const response = await fetch(target, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-request-id': req.headers['x-request-id']?.toString() || `req_event_creation_${Date.now()}`,
      },
      ...(method !== 'GET' ? { body: JSON.stringify(req.body ?? {}) } : {}),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(502).json({
      error: {
        code: 'ORGANIZER_EVENT_PROXY_ERROR',
        message: 'Failed to reach organizer event backend',
        statusCode: 502,
        requestId: 'req_event_creation_proxy',
        details: error?.message,
      },
    });
  }
}
