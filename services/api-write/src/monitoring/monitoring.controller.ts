import { Controller, Get, UseGuards } from '@nestjs/common';
import { StaffGuard } from '../tickets/staff-guard';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
@UseGuards(StaffGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('queues')
  async queues() {
    return this.monitoringService.getQueueHealth();
  }
}
