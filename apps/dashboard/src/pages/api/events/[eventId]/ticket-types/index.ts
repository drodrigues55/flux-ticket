import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

function generateMockJWT(userId: string, role: string): string {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { eventId } = req.query;

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let organizer = await prisma.user.findFirst({
      where: { role: 'ORGANIZER' },
    });

    if (!organizer) {
      organizer = await prisma.user.create({
        data: {
          email: 'mock-organizer@flux.com',
          name: 'Mock Organizer',
          password: 'password123',
          role: 'ORGANIZER',
        },
      });
    }

    const mockToken = generateMockJWT(organizer.id, 'ORGANIZER');
    const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
    
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`,
      },
    };

    if (req.method === 'POST') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(`${apiWriteUrl}/events/${eventId}/ticket-types`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Falha ao encaminhar ticket-types:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar proxy de ticket-types.' });
  }
}
