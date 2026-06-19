import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';
import * as crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketId, documentName } = req.body;

  if (!ticketId || typeof ticketId !== 'string') {
    return res.status(400).json({ error: 'ticketId is required' });
  }

  try {
    // 1. Fetch the ticket from DB
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // 2. Generate HMAC signature
    const secretKey = process.env.HMAC_SECRET_KEY || 'default-super-secret-key-12345';
    const payload = `${ticket.id}:${ticket.buyerCpf}:${ticket.batchId}`;
    const hmacSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    // 3. Update status to VALID and store hmacSignature
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'VALID',
        hmacSignature,
      },
    });
    await (prisma as any).ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: ticket.status,
        toStatus: 'VALID',
        reason: 'DOCUMENT_VALIDATED',
        metadata: { source: 'client-validate', documentName: documentName ?? null },
      },
    });

    return res.status(200).json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        hmacSignature: updatedTicket.hmacSignature,
      },
    });
  } catch (error: any) {
    console.error('[VALIDATE API ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error validating ticket' });
  }
}
