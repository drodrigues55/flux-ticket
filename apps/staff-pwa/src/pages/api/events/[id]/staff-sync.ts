import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
    
    // Gera um token JWT mockado com a role 'STAFF' para autenticar no backend
    const mockPayload = Buffer.from(JSON.stringify({ role: 'STAFF', userId: 'staff-mock' })).toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const mockToken = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${mockPayload}.mocksignature`;

    const response = await fetch(`${apiReadUrl}/events/${id}/staff-sync`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Failed to forward staff-sync:', error);
    return res.status(500).json({ error: 'Internal Server Error forwarding sync' });
  }
}
