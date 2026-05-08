import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { MissingTokenError, type JwtPayload } from "./jwt.types";

const BEARER_PREFIX = "Bearer ";
const ISSUER = "travelhub-auth-service";

@Injectable()
export class JwtVerifier {
  constructor(private readonly jwtService: JwtService) {}

  verify(authorizationHeader: string | undefined): JwtPayload {
    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith(BEARER_PREFIX)
    ) {
      throw new MissingTokenError();
    }
    const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
    return this.jwtService.verify<JwtPayload>(token, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      clockTolerance: 5,
    });
  }
}
