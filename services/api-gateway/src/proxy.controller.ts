import { Controller, All, Req, Res, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
  private readonly serviceMap: Record<string, string>;

  constructor(private readonly proxyService: ProxyService) {
    this.serviceMap = {
      auth: process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001',
      search: process.env['SEARCH_SERVICE_URL'] ?? 'http://localhost:3002',
      inventory: process.env['INVENTORY_SERVICE_URL'] ?? 'http://localhost:3003',
      booking: process.env['BOOKING_SERVICE_URL'] ?? 'http://localhost:3004',
      payment: process.env['PAYMENT_SERVICE_URL'] ?? 'http://localhost:3005',
      notifications: process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3006',
      partners: process.env['PARTNERS_SERVICE_URL'] ?? 'http://localhost:3007',
    };
  }

  @All('api/*')
  async proxy(@Req() req: Request, @Res() res: Response): Promise<void> {
    // req.path = '/api/auth/users' → withoutApi = 'auth/users'
    const withoutApi = req.path.replace(/^\/api\/?/, '');
    const slashIdx = withoutApi.indexOf('/');
    const serviceName = slashIdx === -1 ? withoutApi : withoutApi.slice(0, slashIdx);
    const subpath = slashIdx === -1 ? '' : withoutApi.slice(slashIdx);

    const baseUrl = this.serviceMap[serviceName];
    if (!baseUrl) {
      res.status(HttpStatus.NOT_FOUND).json({ error: `Unknown service: ${serviceName}` });
      return;
    }

    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `${baseUrl}${subpath || '/'}${query}`;

    const { status, body } = await this.proxyService.forward(targetUrl, req);
    res.status(status).json(body);
  }
}
