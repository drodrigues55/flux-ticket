import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiWriteUrl = process.env.API_WRITE_URL || 'http://localhost:4000';
    const requestId = Array.isArray(req.headers['x-request-id']) ? req.headers['x-request-id'][0] : req.headers['x-request-id'];
    const response = await fetch(`${apiWriteUrl}/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(requestId ? { 'x-request-id': requestId } : {}),
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    const upstreamRequestId = response.headers.get('x-request-id') || data?.error?.requestId || data?.requestId || requestId;
    if (upstreamRequestId) {
      res.setHeader('x-request-id', upstreamRequestId);
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[PROXY ERROR] Failed to process payment checkout:', error);
    const requestId = Array.isArray(req.headers['x-request-id']) ? req.headers['x-request-id'][0] : req.headers['x-request-id'];
    return res.status(502).json({
      error: {
        code: 'PAYMENT_PROXY_ERROR',
        message: 'Erro interno ao realizar proxy de pagamento.',
        statusCode: 502,
        requestId: requestId || 'req_unknown',
      },
      code: 'PAYMENT_PROXY_ERROR',
      message: 'Erro interno ao realizar proxy de pagamento.',
      statusCode: 502,
      requestId: requestId || 'req_unknown',
    });
  }
}
