import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('hotels')
  getHotels() {
    return this.appService.getHotels();
  }

  @Get('hotels/:id/revenue')
  getRevenue(@Param('id') id: string) {
    return this.appService.getRevenue(id);
  }

  @Get('revenue')
  getAllRevenue() {
    return this.appService.getAllRevenue();
  }
}
