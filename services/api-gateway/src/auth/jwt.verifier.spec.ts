import { JwtService } from "@nestjs/jwt";
import {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from "jsonwebtoken";
import { MissingTokenError } from "./jwt.types";
import { JwtVerifier } from "./jwt.verifier";

const SECRET = "test-secret-1234567890";
const ISSUER = "travelhub-auth-service";

function buildVerifier(): { verifier: JwtVerifier; jwt: JwtService } {
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: "HS256" },
  });
  return { verifier: new JwtVerifier(jwt), jwt };
}

function bearer(token: string): string {
  return `Bearer ${token}`;
}

describe("JwtVerifier", () => {
  it("returns the payload for a valid token", () => {
    const { verifier, jwt } = buildVerifier();
    const token = jwt.sign(
      { sub: "user-1", email: "u@e.com", role: "guest", partnerId: "p-9" },
      { issuer: ISSUER, expiresIn: "1h" },
    );
    const result = verifier.verify(bearer(token));
    expect(result.sub).toBe("user-1");
    expect(result.partnerId).toBe("p-9");
    expect(result.iss).toBe(ISSUER);
  });

  it("throws MissingTokenError when Authorization header is absent", () => {
    const { verifier } = buildVerifier();
    expect(() => verifier.verify(undefined)).toThrow(MissingTokenError);
  });

  it("throws MissingTokenError when Authorization header is not Bearer", () => {
    const { verifier } = buildVerifier();
    expect(() => verifier.verify("Basic abc")).toThrow(MissingTokenError);
  });

  it("throws JsonWebTokenError for malformed token", () => {
    const { verifier } = buildVerifier();
    expect(() => verifier.verify(bearer("aaa.bbb"))).toThrow(JsonWebTokenError);
  });

  it("rejects alg=none (algorithm-confusion defence)", () => {
    const { verifier } = buildVerifier();
    const headerPart = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");
    const payloadPart = Buffer.from(
      JSON.stringify({
        sub: "x",
        iss: ISSUER,
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).toString("base64url");
    const token = `${headerPart}.${payloadPart}.`;
    expect(() => verifier.verify(bearer(token))).toThrow(JsonWebTokenError);
  });

  it("rejects token signed with a different secret", () => {
    const { verifier } = buildVerifier();
    const otherJwt = new JwtService({
      secret: "other-secret",
      signOptions: { algorithm: "HS256" },
    });
    const token = otherJwt.sign(
      { sub: "user-1" },
      { issuer: ISSUER, expiresIn: "1h" },
    );
    expect(() => verifier.verify(bearer(token))).toThrow(JsonWebTokenError);
  });

  it("throws TokenExpiredError when exp is in the past", () => {
    const { verifier, jwt } = buildVerifier();
    const token = jwt.sign(
      {
        sub: "user-1",
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      { issuer: ISSUER },
    );
    expect(() => verifier.verify(bearer(token))).toThrow(TokenExpiredError);
  });

  it("throws JsonWebTokenError when iss does not match", () => {
    const { verifier, jwt } = buildVerifier();
    const token = jwt.sign(
      { sub: "user-1" },
      { issuer: "evil-issuer", expiresIn: "1h" },
    );
    expect(() => verifier.verify(bearer(token))).toThrow(JsonWebTokenError);
  });

  it("throws NotBeforeError when nbf is in the future", () => {
    const { verifier, jwt } = buildVerifier();
    const token = jwt.sign(
      { sub: "user-1", nbf: Math.floor(Date.now() / 1000) + 600 },
      { issuer: ISSUER, expiresIn: "1h" },
    );
    expect(() => verifier.verify(bearer(token))).toThrow(NotBeforeError);
  });

  it("tolerates 5s clock skew on exp", () => {
    const { verifier, jwt } = buildVerifier();
    const token = jwt.sign(
      {
        sub: "user-1",
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 2,
      },
      { issuer: ISSUER },
    );
    expect(() => verifier.verify(bearer(token))).not.toThrow();
  });
});
