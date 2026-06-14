import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@flux/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticketId } = req.query;

  if (!ticketId || typeof ticketId !== 'string') {
    return res.status(400).json({ error: 'ticketId is required' });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        batch: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Google Wallet JWT Save Payload structure (Boilerplate configuration)
    const jwtClaims = {
      iss: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || 'flux-service-account@google.com',
      aud: 'google',
      origins: ['https://flux-tickets.com'],
      typ: 'savetowallet',
      payload: {
        eventTicketClasses: [
          {
            id: `flux_issuer_id.event_class_${ticket.batch.eventId}`,
            issuerName: 'Flux Tickets',
            eventName: {
              defaultValue: {
                language: 'pt-BR',
                value: ticket.batch.event.title,
              },
            },
            venue: {
              name: {
                defaultValue: {
                  language: 'pt-BR',
                  value: ticket.batch.event.location,
                },
              },
            },
            dateTime: {
              start: ticket.batch.event.date.toISOString(),
            },
          },
        ],
        eventTicketObjects: [
          {
            id: `flux_issuer_id.ticket_object_${ticket.id}`,
            classId: `flux_issuer_id.event_class_${ticket.batch.eventId}`,
            state: 'active',
            barcode: {
              type: 'qrCode',
              value: ticket.id,
              alternateText: 'Seu Ingresso Flux',
            },
            ticketHolderName: 'Comprador Flux',
            ticketNumber: ticket.id,
          },
        ],
      },
    };

    // Encode claims in a mock signed base64 format (ready for real RS256 signing)
    const header = { alg: 'RS256', typ: 'JWT' };
    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Claims = Buffer.from(JSON.stringify(jwtClaims)).toString('base64url');
    const signature = Buffer.from('mock-rs256-signature-bytes').toString('base64url');
    const mockJwt = `${base64Header}.${base64Claims}.${signature}`;

    const saveUrl = `https://pay.google.com/gp/v/save/${mockJwt}`;

    return res.status(200).json({
      success: true,
      saveUrl,
      jwtClaims,
    });
  } catch (error: any) {
    console.error('[GOOGLE PAY API ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error compiling Google Pay link' });
  }
}
