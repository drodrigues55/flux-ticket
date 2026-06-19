import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@flux/database';

export interface AuditLogInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async record(input: AuditLogInput): Promise<void> {
    try {
      await (prisma as any).auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          actorRole: input.actorRole ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          before: input.before ?? undefined,
          after: input.after ?? undefined,
          metadata: input.metadata ?? undefined,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Audit write failed for ${input.action}:${input.entityType}:${input.entityId ?? 'unknown'}`);
      this.logger.debug(error as any);
    }
  }
}
