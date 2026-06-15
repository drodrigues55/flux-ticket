import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';
import * as crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketId, holderName, holderCpf, currentUserId } = req.body;

  if (!ticketId || !holderName || !holderCpf || !currentUserId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // 1. Busca o ingresso e verifica a propriedade
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ingresso não encontrado' });
    }

    if (ticket.buyerId !== currentUserId) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar este ingresso' });
    }

    if (ticket.isTransferred) {
      return res.status(400).json({ error: 'Este ingresso já foi transferido e não permite nova transferência' });
    }

    // 2. Regenera a assinatura HMAC usando o CPF do novo titular
    const secretKey = process.env.HMAC_SECRET_KEY || 'default-super-secret-key-12345';
    const payload = `${ticket.id}:${holderCpf}:${ticket.batchId}`;
    const hmacSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    // 3. Atualiza os detalhes do titular e marca como transferido
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        holderName,
        holderCpf,
        isTransferred: true,
        hmacSignature,
      },
    });

    return res.status(200).json({
      success: true,
      ticket: {
        id: updatedTicket.id,
        holderName: updatedTicket.holderName,
        holderCpf: updatedTicket.holderCpf,
        isTransferred: updatedTicket.isTransferred,
      },
    });
  } catch (error: any) {
    console.error('[TRANSFER API ERROR]', error);
    return res.status(500).json({ error: 'Erro interno ao transferir ingresso' });
  }
}
