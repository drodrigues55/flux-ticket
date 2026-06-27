import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyJson } from '../../../../server/organizerProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', statusCode: 405, requestId: 'req_event_creation_proxy' },
    });
  }

  const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
  return proxyJson(req, res, `${apiWriteUrl}/organizer/events`, 'POST');
}
