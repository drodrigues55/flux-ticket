import { Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@flux/database';
import { AuditService } from '../audit/audit.service';
import { logger } from '../logger';
import { recordTicketStatusHistory } from './ticket-status-history';
import { FluxEngineService } from './flux-engine.service';
import { TicketCryptoService } from './ticket-crypto.service';

type IncomingCheckin = {
  ticketId?: string;
  ticket_id?: string;
  offlineId?: string;
  idempotencyKey?: string;
  scannedAt?: string;
  checkInTimestamp?: string;
  hmacSignature?: string;
  sectorId?: number | null;
  rawPayload?: unknown;
};

type SyncInput = {
  eventId: string;
  ticketIds?: string[];
  checkins?: IncomingCheckin[];
  checkInTimestamp?: string;
  deviceId?: string;
  deviceName?: string;
  pendingCount?: number;
  allowedSectorIds?: number[];
  request: any;
};

type CheckinDecision = {
  ticketId: string | null;
  status: 'ACCEPTED' | 'DUPLICATE' | 'CONFLICT' | 'REJECTED';
  reason?: string;
  checkinId?: string;
  isDuplicateSync?: boolean;
};

@Injectable()
export class StaffPlatformService {
  constructor(
    private readonly auditService: AuditService,
    private readonly fluxEngine: FluxEngineService,
    private readonly ticketCryptoService: TicketCryptoService
  ) {}

  async syncCheckins(input: SyncInput) {
    const {
      eventId,
      deviceId,
      deviceName,
      pendingCount,
      request,
    } = input;
    const allowedSectorIds = this.normalizeAllowedSectorIds(input.allowedSectorIds ?? request.user?.allowedSectorIds);

    if (deviceId && deviceName) {
      const devData = await this.fluxEngine.getStaffDevice(eventId, deviceId);
      if (devData && devData.status === 'disabled') {
        throw new UnauthorizedException('Dispositivo desativado pelo administrador. Sincronização bloqueada.');
      }
      await this.fluxEngine.registerStaffDevice(eventId, deviceId, deviceName, pendingCount || 0, allowedSectorIds);
    }

    const checkins = this.normalizeCheckins(input);
    if (checkins.length === 0) {
      return {
        success: true,
        count: 0,
        accepted: 0,
        duplicates: 0,
        conflicts: 0,
        rejected: 0,
        results: [],
      };
    }

    const results: CheckinDecision[] = [];

    for (const checkin of checkins) {
      results.push(await this.processOneCheckin({
        eventId,
        checkin,
        deviceId,
        deviceName,
        allowedSectorIds,
        request,
      }));
    }

    const accepted = results.filter((result) => result.status === 'ACCEPTED' && !result.isDuplicateSync).length;
    const duplicates = results.filter((result) => result.status === 'DUPLICATE' || (result.status === 'ACCEPTED' && result.isDuplicateSync)).length;
    const conflicts = results.filter((result) => result.status === 'CONFLICT').length;
    const rejected = results.filter((result) => result.status === 'REJECTED').length;

    await this.auditService.record({
      actorId: request.user?.userId,
      actorRole: request.user?.role,
      action: 'STAFF_CHECKINS_SYNC',
      entityType: 'Event',
      entityId: eventId,
      after: { accepted, duplicates, conflicts, rejected },
      metadata: {
        deviceId,
        deviceName,
        allowedSectorIds,
        total: checkins.length,
        ticketIds: checkins.map((item) => this.getTicketId(item)).filter(Boolean),
      },
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    logger.info({
      requestId: request.requestId,
      eventId,
      deviceId,
      accepted,
      duplicates,
      conflicts,
      rejected,
    }, 'staff check-ins synced');

    return {
      success: true,
      count: accepted,
      accepted,
      duplicates,
      conflicts,
      rejected,
      results,
    };
  }

  private normalizeCheckins(input: SyncInput): IncomingCheckin[] {
    if (Array.isArray(input.checkins) && input.checkins.length > 0) {
      return input.checkins;
    }

    if (Array.isArray(input.ticketIds)) {
      return input.ticketIds.map((ticketId) => ({
        ticketId,
        scannedAt: input.checkInTimestamp,
      }));
    }

    return [];
  }

  private normalizeAllowedSectorIds(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item));
  }

  private getTicketId(checkin: IncomingCheckin) {
    return checkin.ticketId || checkin.ticket_id || null;
  }

  private getScannedAt(checkin: IncomingCheckin) {
    const raw = checkin.scannedAt || checkin.checkInTimestamp;
    const parsed = raw ? new Date(raw) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private async processOneCheckin(input: {
    eventId: string;
    checkin: IncomingCheckin;
    deviceId?: string;
    deviceName?: string;
    allowedSectorIds: number[];
    request: any;
  }): Promise<CheckinDecision> {
    const { eventId, checkin, deviceId, deviceName, allowedSectorIds, request } = input;
    const ticketId = this.getTicketId(checkin);
    const scannedAt = this.getScannedAt(checkin);
    const offlineId = checkin.offlineId || checkin.idempotencyKey || null;
    const operatorId = request.user?.userId ?? null;

    if (offlineId) {
      const existingOffline = await (prisma as any).checkin.findUnique({
        where: { eventId_offlineId: { eventId, offlineId } },
      });
      if (existingOffline) {
        return {
          ticketId: existingOffline.ticketId,
          status: existingOffline.status,
          reason: existingOffline.conflictReason ?? undefined,
          checkinId: existingOffline.id,
          isDuplicateSync: true,
        };
      }
    }

    const version = (checkin as any).version ?? 1;
    const rawPayload = {
      checkin,
      deviceId,
      deviceName,
      allowedSectorIds,
    };

    if (ticketId && checkin.hmacSignature) {
      const isSignatureValid = this.ticketCryptoService.verifySignature(ticketId, version, checkin.hmacSignature);
      if (!isSignatureValid) {
        await this.auditRejected(eventId, ticketId, 'SIGNATURE_MISMATCH', request, rawPayload);
        return { ticketId, status: 'CONFLICT', reason: 'SIGNATURE_MISMATCH' };
      }
    }

    const ticket = ticketId
      ? await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { batch: { select: { eventId: true, sectorId: true } } },
        })
      : null;

    const sectorId = ticket?.batch?.sectorId ?? checkin.sectorId ?? null;

    if (!ticketId || !ticket) {
      await this.auditRejected(eventId, ticketId, 'TICKET_NOT_FOUND', request, rawPayload);
      return { ticketId: ticketId ?? null, status: 'REJECTED', reason: 'TICKET_NOT_FOUND' };
    }

    if (ticket.eventId !== eventId || ticket.batch.eventId !== eventId) {
      await this.auditRejected(eventId, ticketId, 'EVENT_MISMATCH', request, rawPayload);
      return { ticketId, status: 'REJECTED', reason: 'EVENT_MISMATCH' };
    }

    if (allowedSectorIds.length > 0 && sectorId !== null && !allowedSectorIds.includes(sectorId)) {
      await this.auditRejected(eventId, ticketId, 'SECTOR_NOT_ALLOWED', request, rawPayload);
      return { ticketId, status: 'REJECTED', reason: 'SECTOR_NOT_ALLOWED' };
    }

    if (checkin.hmacSignature && ticket.hmacSignature && checkin.hmacSignature !== ticket.hmacSignature) {
      await this.auditRejected(eventId, ticketId, 'SIGNATURE_MISMATCH', request, rawPayload);
      return { ticketId, status: 'CONFLICT', reason: 'SIGNATURE_MISMATCH' };
    }

    const existingAccepted = await (prisma as any).checkin.findFirst({
      where: {
        eventId,
        ticketId,
        status: 'ACCEPTED',
      },
      orderBy: { syncedAt: 'asc' },
    });

    if (existingAccepted || ticket.status === 'CONSUMED' || ticket.checkedInAt) {
      const reason = offlineId ? 'OFFLINE_STATE_CONFLICT' : 'ALREADY_CONSUMED';
      const status = offlineId ? 'CONFLICT' : 'DUPLICATE';
      await this.auditRejected(eventId, ticketId, reason, request, rawPayload);
      return { ticketId, status, reason };
    }

    if (ticket.status !== 'VALID') {
      await this.auditRejected(eventId, ticketId, `INVALID_STATUS_${ticket.status}`, request, rawPayload);
      return { ticketId, status: 'CONFLICT', reason: `INVALID_STATUS_${ticket.status}` };
    }

    const updated = await prisma.ticket.updateMany({
      where: {
        id: ticketId,
        eventId,
        status: 'VALID',
        checkedInAt: null,
      },
      data: {
        status: 'CONSUMED',
        checkedInAt: scannedAt,
      },
    });

    if (updated.count !== 1) {
      const reason = offlineId ? 'OFFLINE_STATE_CONFLICT' : 'ALREADY_CONSUMED';
      const status = offlineId ? 'CONFLICT' : 'DUPLICATE';
      await this.auditRejected(eventId, ticketId, reason, request, rawPayload);
      return { ticketId, status, reason };
    }

    const row = await this.createCheckinRecord({
      eventId,
      ticketId,
      offlineId,
      deviceId,
      deviceName,
      operatorId,
      sectorId,
      status: 'ACCEPTED',
      scannedAt,
      requestId: request.requestId,
      rawPayload,
    });

    await recordTicketStatusHistory({
      ticketId,
      fromStatus: ticket.status,
      toStatus: 'CONSUMED',
      reason: 'STAFF_CHECK_IN_SYNC',
      actorId: operatorId,
      requestId: request.requestId,
      metadata: { eventId, deviceId, deviceName, checkinId: row.id, offlineId },
    }).catch((err) => {
      logger.error({ err, requestId: request.requestId, ticketId }, 'ticket status history write failed');
    });

    await this.auditService.record({
      actorId: operatorId,
      actorRole: request.user?.role,
      action: 'TICKET_CHECKED_IN',
      entityType: 'Ticket',
      entityId: ticketId,
      before: { status: ticket.status, checkedInAt: ticket.checkedInAt },
      after: { status: 'CONSUMED', checkedInAt: scannedAt.toISOString() },
      metadata: { eventId, deviceId, deviceName, checkinId: row.id, offlineId, sectorId },
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers?.['user-agent'],
    });

    return { ticketId, status: 'ACCEPTED', checkinId: row.id };
  }

  private async createCheckinRecord(input: {
    eventId: string;
    ticketId: string | null;
    offlineId: string | null;
    deviceId?: string;
    deviceName?: string;
    operatorId: string | null;
    sectorId: number | null;
    status: string;
    conflictReason?: string;
    scannedAt: Date;
    requestId?: string;
    rawPayload: unknown;
  }) {
    return (prisma as any).checkin.create({
      data: {
        eventId: input.eventId,
        ticketId: input.ticketId,
        offlineId: input.offlineId,
        deviceId: input.deviceId ?? null,
        deviceName: input.deviceName ?? null,
        operatorId: input.operatorId,
        sectorId: input.sectorId,
        status: input.status,
        conflictReason: input.conflictReason ?? null,
        scannedAt: input.scannedAt,
        syncedAt: new Date(),
        requestId: input.requestId ?? null,
        rawPayload: input.rawPayload as any,
      },
    });
  }

  private async auditRejected(eventId: string, ticketId: string | null, reason: string, request: any, metadata: unknown) {
    const entityId = reason === 'TICKET_NOT_FOUND' ? eventId : ticketId ?? eventId;
    const entityType = reason === 'TICKET_NOT_FOUND' || !ticketId ? 'Event' : 'Ticket';

    await this.auditService.record({
      actorId: request.user?.userId,
      actorRole: request.user?.role,
      action: 'STAFF_CHECKIN_REJECTED',
      entityType,
      entityId,
      reason,
      metadata,
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers?.['user-agent'],
    });
  }
}
