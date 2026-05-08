import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { AuthMiddleware } from "./auth.middleware";
import { JwtVerifier } from "./jwt.verifier";

const SECRET = "test-secret-1234567890";
const ISSUER = "travelhub-auth-service";

function buildMiddleware(): { middleware: AuthMiddleware; jwt: JwtService } {
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: "HS256" },
  });
  return { middleware: new AuthMiddleware(new JwtVerifier(jwt)), jwt };
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "GET",
    path: "/api/booking/reservations",
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

function sign(jwt: JwtService, payload: Record<string, unknown>): string {
  return jwt.sign(payload, { issuer: ISSUER, expiresIn: "1h" });
}

describe("AuthMiddleware", () => {
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    next = jest.fn();
  });

  it("allows public routes through without a token", () => {
    const { middleware } = buildMiddleware();
    const req = mockReq({ method: "GET", path: "/api/search/featured" });
    const res = mockRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("strips client-supplied identity headers on public routes", () => {
    const { middleware } = buildMiddleware();
    const req = mockReq({
      method: "GET",
      path: "/api/search/featured",
      headers: {
        "x-user-id": "forged",
        "x-partner-id": "forged-partner",
      } as Request["headers"],
    });
    middleware.use(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.headers["x-user-id"]).toBeUndefined();
    expect(req.headers["x-partner-id"]).toBeUndefined();
  });

  it("injects identity headers from a valid token on protected routes", () => {
    const { middleware, jwt } = buildMiddleware();
    const token = sign(jwt, {
      sub: "user-1",
      email: "user@example.com",
      role: "guest",
      partnerId: "partner-9",
    });
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` } as Request["headers"],
    });
    middleware.use(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.headers["x-user-id"]).toBe("user-1");
    expect(req.headers["x-user-email"]).toBe("user@example.com");
    expect(req.headers["x-user-role"]).toBe("guest");
    expect(req.headers["x-partner-id"]).toBe("partner-9");
    expect(req.headers.authorization).toBe(`Bearer ${token}`);
  });

  it("does not set partnerId/propertyId headers when payload lacks them", () => {
    const { middleware, jwt } = buildMiddleware();
    const token = sign(jwt, {
      sub: "user-1",
      email: "u@e.com",
      role: "guest",
    });
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` } as Request["headers"],
    });
    middleware.use(req, mockRes(), next);
    expect(req.headers["x-partner-id"]).toBeUndefined();
    expect(req.headers["x-property-id"]).toBeUndefined();
  });

  it("overwrites client-supplied x-partner-id with the JWT value", () => {
    const { middleware, jwt } = buildMiddleware();
    const token = sign(jwt, {
      sub: "user-1",
      email: "u@e.com",
      role: "partner",
      partnerId: "real-partner",
    });
    const req = mockReq({
      headers: {
        authorization: `Bearer ${token}`,
        "x-partner-id": "evil-partner",
      } as Request["headers"],
    });
    middleware.use(req, mockRes(), next);
    expect(req.headers["x-partner-id"]).toBe("real-partner");
  });

  it("returns 401 when no token is supplied on a protected route", () => {
    const { middleware } = buildMiddleware();
    const req = mockReq();
    const res = mockRes();
    middleware.use(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, error: "Unauthorized" }),
    );
  });

  it("returns 401 when the token is expired", () => {
    const { middleware, jwt } = buildMiddleware();
    const token = jwt.sign(
      {
        sub: "u",
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      { issuer: ISSUER },
    );
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` } as Request["headers"],
    });
    const res = mockRes();
    middleware.use(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when the signature is tampered", () => {
    const { middleware, jwt } = buildMiddleware();
    const token = `${sign(jwt, { sub: "u" }).slice(0, -3)}AAA`;
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` } as Request["headers"],
    });
    const res = mockRes();
    middleware.use(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when alg=none is used", () => {
    const { middleware } = buildMiddleware();
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
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` } as Request["headers"],
    });
    const res = mockRes();
    middleware.use(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
