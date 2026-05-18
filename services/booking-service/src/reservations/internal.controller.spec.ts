import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { InternalReservationsController } from "./internal.controller.js";
import { InternalTokenGuard } from "./internal-token.guard.js";
import type { HoldExpiryService } from "./hold-expiry.service.js";
import type { NoShowService } from "./no-show.service.js";

function makeContext(headers: Record<string, string>): ExecutionContext {
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe("InternalReservationsController", () => {
  it("expire-holds delegates to HoldExpiryService", async () => {
    const holdExpiry = {
      expireHolds: jest
        .fn()
        .mockResolvedValue({ processed: 4, skipped: false }),
    } as unknown as HoldExpiryService;
    const noShow = {} as NoShowService;
    const controller = new InternalReservationsController(holdExpiry, noShow);

    const result = await controller.expireHolds();

    expect(result).toEqual({ processed: 4, skipped: false });
    expect(holdExpiry.expireHolds).toHaveBeenCalledTimes(1);
  });

  it("mark-no-shows delegates to NoShowService", async () => {
    const holdExpiry = {} as HoldExpiryService;
    const noShow = {
      markStaleConfirmedAsNoShow: jest
        .fn()
        .mockResolvedValue({ processed: 2, skipped: false }),
    } as unknown as NoShowService;
    const controller = new InternalReservationsController(holdExpiry, noShow);

    const result = await controller.markNoShows();

    expect(result).toEqual({ processed: 2, skipped: false });
    expect(noShow.markStaleConfirmedAsNoShow).toHaveBeenCalledTimes(1);
  });
});

describe("InternalTokenGuard", () => {
  const ORIGINAL_SECRET = process.env.INTERNAL_CRON_SECRET;

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.INTERNAL_CRON_SECRET;
    } else {
      process.env.INTERNAL_CRON_SECRET = ORIGINAL_SECRET;
    }
  });

  it("allows requests when the header matches the env secret", () => {
    process.env.INTERNAL_CRON_SECRET = "s3cret";
    const guard = new InternalTokenGuard();
    const ctx = makeContext({ "x-internal-token": "s3cret" });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("rejects requests when INTERNAL_CRON_SECRET is unset (fail-closed)", () => {
    delete process.env.INTERNAL_CRON_SECRET;
    const guard = new InternalTokenGuard();
    const ctx = makeContext({ "x-internal-token": "anything" });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("rejects requests with a missing X-Internal-Token header", () => {
    process.env.INTERNAL_CRON_SECRET = "s3cret";
    const guard = new InternalTokenGuard();
    const ctx = makeContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("rejects requests with a wrong token", () => {
    process.env.INTERNAL_CRON_SECRET = "s3cret";
    const guard = new InternalTokenGuard();
    const ctx = makeContext({ "x-internal-token": "wrong" });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("rejects requests with a token of a different length (avoids timingSafeEqual throw)", () => {
    process.env.INTERNAL_CRON_SECRET = "s3cret";
    const guard = new InternalTokenGuard();
    const ctx = makeContext({ "x-internal-token": "s3cretextra" });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
