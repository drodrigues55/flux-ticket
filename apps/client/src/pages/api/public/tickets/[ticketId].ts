import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketId } = req.query;
  if (!ticketId || typeof ticketId !== 'string') {
    return res.status(400).json({ error: 'ticketId is required' });
  }

  try {
    const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
    const response = await fetch(`${apiReadUrl}/public/tickets/${ticketId}`, { method: 'GET' });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('[PROXY ERROR] Failed to fetch ticket details:', error);
    return res.status(502).json({ error: 'Bad Gateway' });
  }
}
