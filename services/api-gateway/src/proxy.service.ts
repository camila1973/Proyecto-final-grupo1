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
    const incomingContentType = req.headers["content-type"];
    const headers: Record<string, string> = {
      "content-type":
        typeof incomingContentType === "string"
          ? incomingContentType
          : "application/json",
    };
    if (req.headers.authorization)
      headers["authorization"] = req.headers.authorization;
    const passthrough = [
      "x-user-id",
      "x-user-email",
      "x-user-role",
      "x-partner-id",
      "x-property-id",
      // Stripe signs the raw request bytes; the verifier in payment-service
      // compares this header against req.rawBody, so it must pass through.
      "stripe-signature",
    ] as const;
    for (const name of passthrough) {
      const value = req.headers[name];
      if (typeof value === "string") headers[name] = value;
    }

    this.logger.log(`→ ${method} ${targetUrl}`);

    // Prefer rawBody (captured because NestFactory was started with rawBody: true)
    // so signed payloads like Stripe webhooks aren't re-serialized in transit.
    // Uint8Array.from(buffer) yields a Uint8Array<ArrayBuffer> that fetch's
    // BodyInit accepts — Node Buffer is Uint8Array<ArrayBufferLike>, which TS
    // does not consider assignable to BodyInit since the typed generic was added.
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const forwardBody: BodyInit | undefined = isBodyless
      ? undefined
      : rawBody
        ? Uint8Array.from(rawBody)
        : JSON.stringify(req.body);

    let response: globalThis.Response;
    try {
      response = await fetch(targetUrl, {
        method,
        headers,
        body: forwardBody,
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
