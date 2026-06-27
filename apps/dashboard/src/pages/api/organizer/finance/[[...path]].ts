import type { NextApiRequest, NextApiResponse } from 'next';
import { organizerToken } from '../../../../server/organizerProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', statusCode: 405, requestId: 'req_finance_proxy' },
    });
  }

  try {
    const apiReadUrl = process.env.API_READ_URL || 'http://localhost:3002';
    const path = Array.isArray(req.query.path) ? req.query.path.join('/') : '';
    const url = new URL(`/organizer/finance/${path}`, apiReadUrl);
    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'path') continue;
      if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
      else if (value !== undefined) url.searchParams.set(key, value);
    }

    const token = await organizerToken();
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-request-id': req.headers['x-request-id']?.toString() || `req_finance_${Date.now()}`,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const requestId = response.headers.get('x-request-id');
    if (requestId) res.setHeader('x-request-id', requestId);
    if (contentType.includes('text/csv')) {
      const text = await response.text();
      res.setHeader('Content-Type', contentType);
      const disposition = response.headers.get('content-disposition');
      if (disposition) res.setHeader('Content-Disposition', disposition);
      return res.status(response.status).send(text);
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(502).json({
      error: {
        code: 'FINANCE_PROXY_ERROR',
        message: 'Failed to reach finance read backend',
        statusCode: 502,
        requestId: 'req_finance_proxy',
        details: error?.message,
      },
    });
  }
}
