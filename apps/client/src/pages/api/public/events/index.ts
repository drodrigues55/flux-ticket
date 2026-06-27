import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
    const { categoryId } = req.query;
    const url = categoryId 
      ? `${apiReadUrl}/public/events?categoryId=${categoryId}` 
      : `${apiReadUrl}/public/events`;

    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (error) {
    console.error('[PROXY ERROR] Failed to fetch public events:', error);
    return res.status(502).json({ error: 'Bad Gateway' });
  }
}
