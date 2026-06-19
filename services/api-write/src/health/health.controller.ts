import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ok } from '../api-response';
import { HealthService } from './health.service';
import { getServiceVersion, renderMetrics } from '../observability';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health/live')
  live(@Req() req: Request) {
    return ok({
      status: 'ok',
      service: 'api-write',
      version: getServiceVersion(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
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

  @Get('version')
  version(@Req() req: Request) {
    return ok(getServiceVersion(), req.requestId || 'req_unknown');
  }

  @Get('metrics')
  async metrics(@Res() res: Response) {
    if (process.env.PROMETHEUS_ENABLED !== 'true') {
      res.status(404).send('metrics disabled');
      return;
    }
    res.type('text/plain').send(await renderMetrics());
  }
}
