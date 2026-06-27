import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyJson } from '../../../../server/organizerProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', statusCode: 405, requestId: 'req_event_creation_proxy' },
    });
  }

  if (req.method === 'GET') {
    const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
    const url = new URL('/organizer/events', apiReadUrl);
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
      else if (value !== undefined) url.searchParams.set(key, value);
    }
    return proxyJson(req, res, url.toString(), 'GET');
  }

  const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
  return proxyJson(req, res, `${apiWriteUrl}/organizer/events`, 'POST');
}
