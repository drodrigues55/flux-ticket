import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { StaffGuard } from './staff-guard';
import { StaffPlatformService } from './staff-platform.service';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffPlatformService: StaffPlatformService) {}

  @Post('checkins/sync')
  @UseGuards(StaffGuard)
  async syncCheckins(
    @Body() body: {
      eventId: string;
      ticketIds?: string[];
      checkins?: Array<{
        ticketId?: string;
        ticket_id?: string;
        offlineId?: string;
        idempotencyKey?: string;
        scannedAt?: string;
        checkInTimestamp?: string;
        hmacSignature?: string;
        sectorId?: number | null;
      }>;
      checkInTimestamp?: string;
      deviceId?: string;
      deviceName?: string;
      pendingCount?: number;
      allowedSectorIds?: number[];
    },
    @Req() req: any
  ) {
    return this.staffPlatformService.syncCheckins({
      eventId: body.eventId,
      ticketIds: body.ticketIds,
      checkins: body.checkins,
      checkInTimestamp: body.checkInTimestamp,
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      pendingCount: body.pendingCount,
      allowedSectorIds: body.allowedSectorIds,
      request: req,
    });
  }
}
