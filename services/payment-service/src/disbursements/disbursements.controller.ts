import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { DisbursementsService } from "./disbursements.service.js";

@Controller("disbursements")
export class DisbursementsController {
  constructor(private readonly service: DisbursementsService) {}

  @Get("by-partner/:partnerId")
  byPartner(
    @Param("partnerId") partnerId: string,
    @Query("month") month: string,
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException(
        `month query param required, format YYYY-MM (got: ${String(month)})`,
      );
    }
    return this.service.getByPartnerAndMonth(partnerId, month);
  }
}
