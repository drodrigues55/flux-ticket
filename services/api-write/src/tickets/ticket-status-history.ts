import { prisma } from '@flux/database';

export async function recordTicketStatusHistory(input: {
  ticketId: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  actorId?: string | null;
  requestId?: string | null;
  metadata?: unknown;
}) {
  await (prisma as any).ticketStatusHistory.create({
    data: {
      ticketId: input.ticketId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      reason: input.reason ?? null,
      actorId: input.actorId ?? null,
      requestId: input.requestId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}
