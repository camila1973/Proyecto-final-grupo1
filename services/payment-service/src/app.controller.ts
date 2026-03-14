import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('transactions')
  getTransactions() {
    return this.appService.getTransactions();
  }

  @Post('charge')
  charge(@Body() body: { reservationId: string; amount: number; currency: string; provider: string }) {
    return this.appService.charge(body);
  }
}
