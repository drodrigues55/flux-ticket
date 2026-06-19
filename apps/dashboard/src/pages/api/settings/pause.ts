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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paused } = req.body;

  if (paused === undefined) {
    return res.status(400).json({ error: 'paused is required' });
  }

  try {
    const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiWriteUrl}/settings/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${generateMockJWT('organizer-mock', 'ORGANIZER')}`,
      },
      body: JSON.stringify({ paused }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Failed to update sales pause settings:', error);
    return res.status(500).json({ error: 'Internal Server Error forwarding settings' });
  }
}
