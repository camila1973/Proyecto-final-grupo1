import { Test, TestingModule } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { ProxyController } from "./proxy.controller";
import { ProxyService } from "./proxy.service";

const mockProxyService = {
  forward: jest.fn(),
};

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (
  path: string,
  url: string,
  method = "GET",
  headers: Record<string, string> = {},
) => ({
  path,
  url,
  method,
  headers,
  body: {},
});

describe("ProxyController", () => {
  let controller: ProxyController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [{ provide: ProxyService, useValue: mockProxyService }],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
  });

  describe("proxy — known services", () => {
    const knownServices = [
      "auth",
      "search",
      "inventory",
      "booking",
      "payment",
      "notifications",
      "partners",
    ];

    it.each(knownServices)(
      "forwards request to %s service",
      async (serviceName) => {
        mockProxyService.forward.mockResolvedValue({
          status: 200,
          body: { ok: true },
        });

        const req = mockRequest(
          `/api/${serviceName}/some/path`,
          `/api/${serviceName}/some/path`,
        ) as any;
        const res = mockResponse();

        await controller.proxy(req, res);

        expect(mockProxyService.forward).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
      },
    );

    it("returns 404 for unknown service", async () => {
      const req = mockRequest("/api/unknown/path", "/api/unknown/path") as any;
      const res = mockResponse();

      await controller.proxy(req, res);

      expect(mockProxyService.forward).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        error: "Unknown service: unknown",
      });
    });
  });

  describe("proxy — URL construction", () => {
    it("appends query string to target url", async () => {
      mockProxyService.forward.mockResolvedValue({ status: 200, body: [] });

      const req = mockRequest(
        "/api/search/properties",
        "/api/search/properties?city=cancun&limit=10",
      ) as any;
      const res = mockResponse();

      await controller.proxy(req, res);

      const [targetUrl] = mockProxyService.forward.mock.calls[0];
      expect(targetUrl).toContain("?city=cancun&limit=10");
    });

    it("handles request with no subpath (service root)", async () => {
      mockProxyService.forward.mockResolvedValue({ status: 200, body: {} });

      const req = mockRequest("/api/auth", "/api/auth") as any;
      const res = mockResponse();

      await controller.proxy(req, res);

      const [targetUrl] = mockProxyService.forward.mock.calls[0];
      expect(targetUrl).toMatch(/\/$/);
    });

    it("constructs correct target URL for nested path", async () => {
      mockProxyService.forward.mockResolvedValue({ status: 200, body: {} });

      const req = mockRequest(
        "/api/booking/reservations/123",
        "/api/booking/reservations/123",
      ) as any;
      const res = mockResponse();

      await controller.proxy(req, res);

      const [targetUrl] = mockProxyService.forward.mock.calls[0];
      expect(targetUrl).toContain("/reservations/123");
    });
  });

  describe("proxy — response passthrough", () => {
    it("passes upstream status code to response", async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 201,
        body: { id: "new-id" },
      });

      const req = mockRequest(
        "/api/auth/register",
        "/api/auth/register",
        "POST",
      ) as any;
      const res = mockResponse();

      await controller.proxy(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("passes 502 upstream error to response", async () => {
      mockProxyService.forward.mockResolvedValue({
        status: 502,
        body: { error: "Bad Gateway" },
      });

      const req = mockRequest(
        "/api/payment/charge",
        "/api/payment/charge",
      ) as any;
      const res = mockResponse();

      await controller.proxy(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({ error: "Bad Gateway" });
    });

    it("passes the request object to ProxyService.forward", async () => {
      mockProxyService.forward.mockResolvedValue({ status: 200, body: {} });

      const req = mockRequest(
        "/api/inventory/rooms",
        "/api/inventory/rooms",
        "GET",
        { authorization: "Bearer tok" },
      ) as any;
      const res = mockResponse();

      await controller.proxy(req, res);

      expect(mockProxyService.forward).toHaveBeenCalledWith(
        expect.any(String),
        req,
      );
    });
  });

  describe("proxy — env var overrides", () => {
    it("uses AUTH_SERVICE_URL env var when set", async () => {
      process.env["AUTH_SERVICE_URL"] = "http://auth-svc:8080";
      mockProxyService.forward.mockResolvedValue({ status: 200, body: {} });

      // Rebuild module to pick up env var
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ProxyController],
        providers: [{ provide: ProxyService, useValue: mockProxyService }],
      }).compile();

      const ctrl = module.get<ProxyController>(ProxyController);
      const req = mockRequest(
        "/api/auth/login",
        "/api/auth/login",
        "POST",
      ) as any;
      const res = mockResponse();

      await ctrl.proxy(req, res);

      const [targetUrl] = mockProxyService.forward.mock.calls[0];
      expect(targetUrl).toContain("http://auth-svc:8080");

      delete process.env["AUTH_SERVICE_URL"];
    });
  });
});
