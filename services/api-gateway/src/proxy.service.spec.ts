import { Test, TestingModule } from "@nestjs/testing";
import { ProxyService } from "./proxy.service";

const mockRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    method: "GET",
    headers: {},
    body: {},
    ...overrides,
  }) as any;

describe("ProxyService", () => {
  let service: ProxyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProxyService],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("forward — successful responses", () => {
    it("returns status and parsed JSON body", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({ data: "ok" }),
      });
      global.fetch = mockFetch;

      const result = await service.forward(
        "http://localhost:3001/users",
        mockRequest(),
      );

      expect(result).toEqual({ status: 200, body: { data: "ok" } });
    });

    it("passes authorization header when present", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });
      global.fetch = mockFetch;

      await service.forward(
        "http://localhost:3001/users",
        mockRequest({ headers: { authorization: "Bearer token123" } }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer token123",
          }),
        }),
      );
    });

    it("passes x-partner-id header when present", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });
      global.fetch = mockFetch;

      await service.forward(
        "http://localhost:3007/partners",
        mockRequest({ headers: { "x-partner-id": "partner-abc" } }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-partner-id": "partner-abc",
          }),
        }),
      );
    });

    it("sends body for POST requests", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 201,
        json: jest.fn().mockResolvedValue({ id: 1 }),
      });
      global.fetch = mockFetch;

      const body = { name: "test" };
      const result = await service.forward(
        "http://localhost:3001/users",
        mockRequest({ method: "POST", body }),
      );

      expect(result.status).toBe(201);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    });

    it("sends no body for GET requests", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue([]),
      });
      global.fetch = mockFetch;

      await service.forward(
        "http://localhost:3001/users",
        mockRequest({ method: "GET" }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: undefined }),
      );
    });

    it("sends no body for HEAD requests", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });
      global.fetch = mockFetch;

      await service.forward(
        "http://localhost:3001/users",
        mockRequest({ method: "HEAD" }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: undefined }),
      );
    });

    it("sends no body for DELETE requests", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 204,
        json: jest.fn().mockResolvedValue({}),
      });
      global.fetch = mockFetch;

      await service.forward(
        "http://localhost:3001/users/1",
        mockRequest({ method: "DELETE" }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: undefined }),
      );
    });

    it("sends body for PUT requests", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({ updated: true }),
      });
      global.fetch = mockFetch;

      const body = { name: "updated" };
      await service.forward(
        "http://localhost:3001/users/1",
        mockRequest({ method: "PUT", body }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(body),
        }),
      );
    });

    it("returns empty body when JSON parse fails", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        status: 200,
        json: jest.fn().mockRejectedValue(new Error("invalid json")),
      });
      global.fetch = mockFetch;

      const result = await service.forward(
        "http://localhost:3001/users",
        mockRequest(),
      );

      expect(result).toEqual({ status: 200, body: {} });
    });
  });

  describe("forward — upstream errors", () => {
    it("returns 502 when fetch throws a network error", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await service.forward(
        "http://localhost:3001/users",
        mockRequest(),
      );

      expect(result).toEqual({
        status: 502,
        body: {
          error: "Bad Gateway",
          upstream: "http://localhost:3001/users",
        },
      });
    });

    it("returns 502 with the correct upstream url on failure", async () => {
      const targetUrl = "http://localhost:3004/bookings/123";
      global.fetch = jest.fn().mockRejectedValue(new Error("connection reset"));

      const result = await service.forward(targetUrl, mockRequest());

      expect(result.status).toBe(502);
      expect((result.body as any).upstream).toBe(targetUrl);
    });
  });
});
