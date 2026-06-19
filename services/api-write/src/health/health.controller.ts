import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ok } from '../api-response';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health/live')
  live(@Req() req: Request) {
    return ok({
      status: 'ok',
      service: 'api-write',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    }, req.requestId || 'req_unknown');
  }

  @Get('health/ready')
  async ready(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.ready();
    if (result.status !== 'ok') {
      res.status(503);
    }
    return ok(result, req.requestId || 'req_unknown');
  }
}
