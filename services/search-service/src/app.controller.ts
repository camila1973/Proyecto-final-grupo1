import { Controller, Get, Query, Param } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  getHealth() {
    return this.appService.getHealth();
  }

  @Get("properties")
  searchProperties(
    @Query("city") city?: string,
    @Query("checkIn") checkIn?: string,
    @Query("checkOut") checkOut?: string,
    @Query("guests") guests?: string,
  ) {
    return this.appService.searchProperties({
      city,
      checkIn,
      checkOut,
      guests: Number(guests),
    });
  }

  @Get("properties/:id")
  getProperty(@Param("id") id: string) {
    return this.appService.getProperty(id);
  }
}
