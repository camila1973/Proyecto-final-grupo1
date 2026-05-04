import { Test, TestingModule } from "@nestjs/testing";
import { ProxyService } from "./proxy.service";

const mockHeaders = (contentType: string | null = null) => ({
  get: jest
    .fn()
    .mockImplementation((key: string) =>
      key === "content-type" ? contentType : null,
    ),
});

const mockJsonFetch = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({
    status,
    headers: mockHeaders("application/json"),
    json: jest.fn().mockResolvedValue(body),
  });

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
      global.fetch = mockJsonFetch(200, { data: "ok" });

      const result = await service.forward(
        "http://localhost:3001/users",
        mockRequest(),
      );

      expect(result).toEqual({
        binary: false,
        status: 200,
        body: { data: "ok" },
      });
    });

    it("passes authorization header when present", async () => {
      const mockFetch = mockJsonFetch(200, {});
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
      const mockFetch = mockJsonFetch(200, {});
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
      const mockFetch = mockJsonFetch(201, { id: 1 });
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
      const mockFetch = mockJsonFetch(200, []);
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
      const mockFetch = mockJsonFetch(200, {});
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
      const mockFetch = mockJsonFetch(204, {});
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
      const mockFetch = mockJsonFetch(200, { updated: true });
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
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        headers: mockHeaders("application/json"),
        json: jest.fn().mockRejectedValue(new Error("invalid json")),
      });

      const result = await service.forward(
        "http://localhost:3001/users",
        mockRequest(),
      );

      expect(result).toEqual({ binary: false, status: 200, body: {} });
    });

    it("returns binary buffer for application/pdf response", async () => {
      const pdfBytes = Buffer.from("%PDF-1.4 fake content");
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        headers: mockHeaders("application/pdf"),
        arrayBuffer: jest
          .fn()
          .mockResolvedValue(
            pdfBytes.buffer.slice(
              pdfBytes.byteOffset,
              pdfBytes.byteOffset + pdfBytes.byteLength,
            ),
          ),
      });

      const result = await service.forward(
        "http://localhost:3007/partners/p1/properties/prop1/checkin-pdf",
        mockRequest(),
      );

      expect(result.binary).toBe(true);
      expect(result.status).toBe(200);
      if (result.binary) {
        expect(result.contentType).toBe("application/pdf");
        expect(result.buffer).toBeInstanceOf(Buffer);
      }
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
        binary: false,
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
      expect(((result as { body: unknown }).body as any).upstream).toBe(
        targetUrl,
      );
    });
  });
});
