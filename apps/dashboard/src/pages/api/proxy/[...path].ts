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
  try {
    const { path } = req.query;
    if (!path || !Array.isArray(path)) {
      return res.status(400).json({ error: 'Path ausente' });
    }

    const endpointPath = path.join('/');
    
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

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(`${apiWriteUrl}/${endpointPath}`, fetchOptions);
    
    // Some endpoints might return empty response (e.g. 204 No Content)
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = text;
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[GENERIC PROXY ERROR]', error);
    return res.status(500).json({ error: 'Erro interno no proxy.' });
  }
}
