import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';

    // Gera um token JWT mockado com a role 'STAFF' para autenticar no backend
    const mockPayload = Buffer.from(JSON.stringify({ role: 'STAFF', userId: 'staff-mock' })).toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const mockToken = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${mockPayload}.mocksignature`;

    const response = await fetch(`${apiWriteUrl}/events/${id}/staff-mutation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Failed to forward staff-mutation:', error);
    return res.status(500).json({ error: 'Internal Server Error forwarding mutation' });
  }
}
