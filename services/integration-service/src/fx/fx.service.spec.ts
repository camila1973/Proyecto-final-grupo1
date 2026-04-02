import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { FxService } from "./fx.service";

const mockHttpService = { post: jest.fn() };

describe("FxService", () => {
  let service: FxService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();
    service = module.get<FxService>(FxService);
  });

  it("returns amount unchanged when currency is USD", async () => {
    const result = await service.convertToUsd(100, "USD");
    expect(result).toBe(100);
    expect(mockHttpService.post).not.toHaveBeenCalled();
  });

  it("returns amount unchanged and logs warning when FX_MOCK=true (default)", async () => {
    const original = process.env.FX_MOCK;
    delete process.env.FX_MOCK;
    try {
      const result = await service.convertToUsd(500, "EUR");
      expect(result).toBe(500);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    } finally {
      if (original !== undefined) process.env.FX_MOCK = original;
    }
  });

  it("returns amount unchanged when FX_MOCK is not 'false'", async () => {
    const original = process.env.FX_MOCK;
    process.env.FX_MOCK = "true";
    try {
      const result = await service.convertToUsd(200, "COP");
      expect(result).toBe(200);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    } finally {
      if (original !== undefined) process.env.FX_MOCK = original;
      else delete process.env.FX_MOCK;
    }
  });

  it("calls HttpService POST and returns converted amount when FX_MOCK=false", async () => {
    const original = process.env.FX_MOCK;
    process.env.FX_MOCK = "false";
    mockHttpService.post.mockReturnValue(of({ data: { amountUsd: 42.5 } }));
    try {
      const result = await service.convertToUsd(1000, "COP");
      expect(result).toBe(42.5);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/fx/convert"),
        { amount: 1000, from: "COP", to: "USD" },
      );
    } finally {
      if (original !== undefined) process.env.FX_MOCK = original;
      else delete process.env.FX_MOCK;
    }
  });

  it("throws when HttpService POST fails and FX_MOCK=false", async () => {
    const original = process.env.FX_MOCK;
    process.env.FX_MOCK = "false";
    mockHttpService.post.mockReturnValue(
      throwError(() => new Error("network error")),
    );
    try {
      await expect(service.convertToUsd(100, "EUR")).rejects.toThrow(
        "network error",
      );
    } finally {
      if (original !== undefined) process.env.FX_MOCK = original;
      else delete process.env.FX_MOCK;
    }
  });
});
