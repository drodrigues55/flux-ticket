import type { NextApiRequest, NextApiResponse } from 'next';

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
        statusCode: 405,
        requestId: 'req_dashboard_proxy',
      },
    });
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
  if (!path) {
    return res.status(400).json({
      error: {
        code: 'DASHBOARD_PROXY_PATH_REQUIRED',
        message: 'Dashboard proxy path is required',
        statusCode: 400,
        requestId: 'req_dashboard_proxy',
      },
    });
  }

  try {
    const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
    const url = new URL(`/dashboard/${path}`, apiReadUrl);

    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'path') continue;
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item));
      } else if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${generateMockJWT('organizer-mock', 'ORGANIZER')}`,
        'x-request-id': req.headers['x-request-id']?.toString() || `req_dashboard_${Date.now()}`,
      },
    });
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(502).json({
      error: {
        code: 'DASHBOARD_API_READ_UNAVAILABLE',
        message: 'Failed to reach dashboard backend',
        statusCode: 502,
        requestId: 'req_dashboard_proxy',
        details: error?.message,
      },
    });
  }
}
