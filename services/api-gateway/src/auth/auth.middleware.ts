import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import { MissingTokenError } from "./jwt.types";
import { JwtVerifier } from "./jwt.verifier";
import { isPublicRoute } from "./public-routes";

const IDENTITY_HEADERS = [
  "x-user-id",
  "x-user-email",
  "x-user-role",
  "x-partner-id",
  "x-property-id",
] as const;

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private readonly verifier: JwtVerifier) {}

  use(req: Request, res: Response, next: NextFunction): void {
    for (const header of IDENTITY_HEADERS) {
      delete req.headers[header];
    }

    if (isPublicRoute(req.method, req.path)) {
      next();
      return;
    }

    try {
      const payload = this.verifier.verify(req.headers.authorization);
      req.headers["x-user-id"] = payload.sub;
      req.headers["x-user-email"] = payload.email;
      req.headers["x-user-role"] = payload.role;
      if (payload.partnerId) req.headers["x-partner-id"] = payload.partnerId;
      if (payload.propertyId) req.headers["x-property-id"] = payload.propertyId;
      next();
    } catch (err) {
      const reason =
        err instanceof MissingTokenError || err instanceof JsonWebTokenError
          ? err.name
          : "UnknownError";
      this.logger.warn(
        `auth_failed method=${req.method} path=${req.path} reason=${reason}`,
      );
      res.status(401).json({
        statusCode: 401,
        message: "Invalid or missing authentication token",
        error: "Unauthorized",
      });
    }
  }
}
