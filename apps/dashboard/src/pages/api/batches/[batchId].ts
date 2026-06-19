import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { batchId } = req.query;
  const { isActive } = req.body;

  if (!batchId || typeof batchId !== 'string' || isActive === undefined) {
    return res.status(400).json({ error: 'batchId and isActive are required' });
  }

  try {
    const updatedBatch = await prisma.ticketBatch.update({
      where: { id: batchId },
      data: { isActive: !!isActive },
    });

    return res.status(200).json({
      success: true,
      batch: {
        id: updatedBatch.id,
        name: updatedBatch.name,
        isActive: updatedBatch.isActive,
      },
    });
  } catch (error: any) {
    console.error('[BATCH STATUS UPDATE ERROR]', error);
    return res.status(500).json({ error: 'Erro interno ao alterar estado do lote.' });
  }
}
