import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';

  try {
    const response = await fetch(`${apiReadUrl}/public/events`, {
      headers: {
        'x-request-id': req.headers['x-request-id']?.toString() || `req_staff_events_${Date.now()}`,
      },
    });

    const payload = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.send(payload);
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to reach events read backend',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
