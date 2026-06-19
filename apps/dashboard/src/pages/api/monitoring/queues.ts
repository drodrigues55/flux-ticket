import type { NextApiRequest, NextApiResponse } from 'next';

function generateMockJWT(userId: string, role: string): string {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = { userId, role };
  const toBase64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${toBase64Url(header)}.${toBase64Url(payload)}.mocksignature`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiWriteUrl}/monitoring/queues`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${generateMockJWT('organizer-mock', 'ORGANIZER')}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Failed to retrieve queue monitoring:', error);
    return res.status(500).json({ error: 'Internal Server Error forwarding monitoring request' });
  }
}
