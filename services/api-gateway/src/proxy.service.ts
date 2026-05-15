import { Injectable, Logger } from "@nestjs/common";
import type { Request } from "express";

export type ProxyResult =
  | { binary: false; status: number; body: unknown }
  | {
      binary: true;
      status: number;
      contentType: string;
      disposition: string;
      buffer: Buffer;
    };

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  async forward(targetUrl: string, req: Request): Promise<ProxyResult> {
    const method = req.method.toUpperCase();
    const isBodyless = ["GET", "HEAD", "DELETE"].includes(method);
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (req.headers.authorization)
      headers["authorization"] = req.headers.authorization;
    const passthrough = [
      "x-user-id",
      "x-user-email",
      "x-user-role",
      "x-partner-id",
      "x-property-id",
    ] as const;
    for (const name of passthrough) {
      const value = req.headers[name];
      if (typeof value === "string") headers[name] = value;
    }

    this.logger.log(`→ ${method} ${targetUrl}`);

    let response: globalThis.Response;
    try {
      response = await fetch(targetUrl, {
        method,
        headers,
        body: isBodyless ? undefined : JSON.stringify(req.body),
      });
    } catch (err) {
      this.logger.error(
        `Upstream unreachable: ${targetUrl} — ${(err as Error).message}`,
      );
      return {
        binary: false,
        status: 502,
        body: { error: "Bad Gateway", upstream: targetUrl },
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const disposition = response.headers.get("content-disposition") ?? "";
    const isAttachment = disposition.toLowerCase().includes("attachment");
    const isJson = contentType.includes("application/json");
    if (isAttachment || (!isJson && contentType !== "")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        binary: true,
        status: response.status,
        contentType,
        disposition: disposition || "attachment; filename=download",
        buffer,
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    return { binary: false, status: response.status, body };
  }
}
