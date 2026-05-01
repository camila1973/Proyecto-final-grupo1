import { Controller, Get, Param } from "@nestjs/common";
import { PropertyCheckinKeyService } from "./property-checkin-key.service.js";

@Controller()
export class PropertyCheckinKeyController {
  constructor(private readonly service: PropertyCheckinKeyService) {}

  @Get("partners/:partnerId/properties/:propertyId/checkin-qr")
  getCheckinQr(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
  ) {
    return this.service.findKey(partnerId, propertyId);
  }

  @Get("internal/partners/:partnerId/properties/:propertyId/checkin-key")
  getCheckinKey(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
  ) {
    return this.service
      .findKey(partnerId, propertyId)
      .then(({ checkInKey }) => ({ checkInKey }));
  }
}
