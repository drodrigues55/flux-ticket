import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';
import * as crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketId, action } = req.body;

  if (!ticketId || !action || (action !== 'approve' && action !== 'reject')) {
    return res.status(400).json({ error: 'ticketId and action ("approve" | "reject") are required' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status !== 'PENDING_VALIDATION') {
      return res.status(400).json({ error: 'Este ingresso não está pendente de validação.' });
    }

    if (action === 'approve') {
      // 1. Generate signature
      const secretKey = process.env.HMAC_SECRET_KEY || 'default-super-secret-key-12345';
      const activeCpf = ticket.holderCpf || ticket.buyerCpf;
      const payload = `${ticket.id}:${activeCpf}:${ticket.batchId}`;
      const hmacSignature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

      // 2. Approve ticket
      await prisma.ticket.update({
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
          reason: 'HALF_PRICE_APPROVED',
          metadata: { source: 'dashboard-validation' },
        },
      });

      return res.status(200).json({ success: true, message: 'Documento aprovado e ingresso ativado.' });
    } else {
      // 3. Reject ticket: revoke status and restore batch inventory capacity
      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'REVOKED' },
        }),
        prisma.ticketBatch.update({
          where: { id: ticket.batchId },
          data: { availableQuantity: { increment: 1 } },
        }),
        (prisma as any).ticketStatusHistory.create({
          data: {
            ticketId,
            fromStatus: ticket.status,
            toStatus: 'REVOKED',
            reason: 'HALF_PRICE_REJECTED',
            metadata: { source: 'dashboard-validation' },
          },
        }),
      ]);

      return res.status(200).json({ success: true, message: 'Documento reprovado. Ingresso revogado e lote estornado.' });
    }
  } catch (error: any) {
    console.error('[TICKET AUDIT VALIDATION ERROR]', error);
    return res.status(500).json({ error: 'Erro interno ao validar ingresso.' });
  }
}
