import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { CommissionRulesService } from "./commission-rules.service.js";

@Controller("commission-rules")
export class CommissionRulesController {
  constructor(private readonly service: CommissionRulesService) {}

  @Get("resolve")
  resolve(
    @Query("partnerId") partnerId: string,
    @Query("onDate") onDate?: string,
  ) {
    if (!partnerId) {
      throw new BadRequestException("partnerId query param required");
    }
    if (onDate && !/^\d{4}-\d{2}-\d{2}$/.test(onDate)) {
      throw new BadRequestException(
        `onDate must be YYYY-MM-DD (got: ${onDate})`,
      );
    }
    const date = onDate ?? new Date().toISOString().slice(0, 10);
    return this.service.resolveDetailed(partnerId, date);
  }
}
