import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { timingSafeEqual } from "crypto";

// Guards `/internal/*` endpoints. Cloud Scheduler is configured to send
// `X-Internal-Token: <secret>` and we verify the value matches
// `process.env.INTERNAL_CRON_SECRET` in constant time.
//
// Fails closed: if the env var is unset the guard rejects every request so a
// misconfigured deployment can't accidentally expose the endpoint.
@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly logger = new Logger(InternalTokenGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_CRON_SECRET;
    if (!expected) {
      this.logger.error(
        "INTERNAL_CRON_SECRET is unset; refusing internal request.",
      );
      throw new UnauthorizedException();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const headerValue = req.header("x-internal-token");
    if (!headerValue) {
      throw new UnauthorizedException();
    }

    const provided = Buffer.from(headerValue);
    const reference = Buffer.from(expected);
    if (
      provided.length !== reference.length ||
      !timingSafeEqual(provided, reference)
    ) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
