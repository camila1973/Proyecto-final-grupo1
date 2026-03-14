import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('reservations')
  getReservations() {
    return this.appService.getReservations();
  }

  @Get('reservations/:id')
  getReservation(@Param('id') id: string) {
    return this.appService.getReservation(id);
  }

  @Post('reservations')
  createReservation(@Body() body: { propertyId: string; roomId: string; guestId: string; checkIn: string; checkOut: string }) {
    return this.appService.createReservation(body);
  }
}
