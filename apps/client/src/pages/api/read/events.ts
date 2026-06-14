import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';

    // Forward query params (e.g. ?categoryId=1) to the upstream api-read service
    const params = new URLSearchParams();
    if (req.query.categoryId) {
      params.set('categoryId', String(req.query.categoryId));
    }
    const queryString = params.toString();
    const upstreamUrl = queryString
      ? `${apiReadUrl}/events?${queryString}`
      : `${apiReadUrl}/events`;

    const response = await fetch(upstreamUrl, { method: 'GET' });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || 'Failed to retrieve catalog events' });
    }

    const data = await response.json();

    // Prevent browser from caching filtered responses
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Failed to fetch events from api-read:', error);
    return res.status(502).json({ error: 'Serviço de leitura (api-read) indisponível. Bad Gateway.' });
  }
}
