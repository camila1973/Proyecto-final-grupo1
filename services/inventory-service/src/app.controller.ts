import { Controller, Get, Query } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  getHealth() {
    return this.appService.getHealth();
  }

  @Get("rooms")
  getRooms(@Query("propertyId") propertyId?: string) {
    return this.appService.getRooms(propertyId);
  }

  @Get("availability")
  getAvailability(
    @Query("propertyId") propertyId: string,
    @Query("checkIn") checkIn: string,
    @Query("checkOut") checkOut: string,
  ) {
    return this.appService.getAvailability(propertyId, checkIn, checkOut);
  }
}
