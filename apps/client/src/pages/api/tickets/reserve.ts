import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/jwt';

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {};
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURI(parts.join('='));
  });
  return list;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId, batchId, price, isHalfPrice, quantity, items } = req.body;

  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  if (!items && (!batchId || price === undefined)) {
    return res.status(400).json({ error: 'batchId and price, or items list, is required' });
  }

  // Retrieve authenticated user from secure session cookie
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['flux_token'];
  const decoded = token ? verifyToken(token) : null;
  const userId = decoded?.id || undefined;

  try {
    const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiWriteUrl}/tickets/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId, batchId, price, isHalfPrice, quantity, items, userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Failed to reserve ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error forwarding reservation' });
  }
}
