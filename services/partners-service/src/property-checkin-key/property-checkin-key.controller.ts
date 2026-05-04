import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { PropertyCheckinKeyService } from "./property-checkin-key.service.js";

@Controller()
export class PropertyCheckinKeyController {
  constructor(private readonly service: PropertyCheckinKeyService) {}

  @Get("partners/:partnerId/properties/:propertyId/checkin-publickey")
  getCheckinPublicKey(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
  ) {
    return this.service.findKey(partnerId, propertyId);
  }

  @Patch(
    "partners/:partnerId/properties/:propertyId/checkin-publickey/regenerate",
  )
  @HttpCode(HttpStatus.OK)
  regenerateCheckinPublicKey(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
  ) {
    return this.service.regenerateKey(partnerId, propertyId);
  }

  @Get("partners/:partnerId/properties/:propertyId/checkin-publickey/download")
  async downloadCheckinPublicKey(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
    @Res() res: Response,
  ) {
    await this.service.generateCheckinPdf(partnerId, propertyId, res);
  }

  @Get("internal/partners/:partnerId/properties/:propertyId/checkin-publickey")
  getCheckinKey(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
  ) {
    return this.service
      .findKey(partnerId, propertyId)
      .then(({ checkInKey }) => ({ checkInKey }));
  }
}
