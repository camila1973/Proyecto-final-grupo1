import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  async forward(targetUrl: string, req: Request): Promise<{ status: number; body: unknown }> {
    const method = req.method.toUpperCase();
    const isBodyless = ['GET', 'HEAD', 'DELETE'].includes(method);
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (req.headers.authorization) headers['authorization'] = req.headers.authorization;

    this.logger.log(`→ ${method} ${targetUrl}`);

    let response: globalThis.Response;
    try {
      response = await fetch(targetUrl, {
        method,
        headers,
        body: isBodyless ? undefined : JSON.stringify(req.body),
      });
    } catch (err) {
      this.logger.error(`Upstream unreachable: ${targetUrl} — ${(err as Error).message}`);
      return { status: 502, body: { error: 'Bad Gateway', upstream: targetUrl } };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    return { status: response.status, body };
  }
}
