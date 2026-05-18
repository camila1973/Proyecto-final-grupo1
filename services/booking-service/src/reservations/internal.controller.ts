import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  HoldExpiryService,
  type ExpireHoldsResult,
} from "./hold-expiry.service.js";
import { NoShowService, type MarkNoShowsResult } from "./no-show.service.js";
import { InternalTokenGuard } from "./internal-token.guard.js";

// HTTP endpoints driven by Google Cloud Scheduler. Each handler is the same
// code that the @nestjs/schedule @Interval used to invoke — the schedule
// itself lives in Cloud Scheduler now (see pulumi/index.ts).
//
// The URLs sit alongside the regular `/reservations` resource on purpose:
// access control is enforced by `InternalTokenGuard` at runtime, not by URL
// shape, so the same routes can later be flipped public-with-RBAC without
// changing every caller.
@Controller("reservations")
@UseGuards(InternalTokenGuard)
export class InternalReservationsController {
  constructor(
    private readonly holdExpiryService: HoldExpiryService,
    private readonly noShowService: NoShowService,
  ) {}

  @Post("expire-holds")
  @HttpCode(HttpStatus.OK)
  expireHolds(): Promise<ExpireHoldsResult> {
    return this.holdExpiryService.expireHolds();
  }

  @Post("mark-no-shows")
  @HttpCode(HttpStatus.OK)
  markNoShows(): Promise<MarkNoShowsResult> {
    return this.noShowService.markStaleConfirmedAsNoShow();
  }
}
