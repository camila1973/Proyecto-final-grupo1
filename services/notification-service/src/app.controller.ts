import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('notifications')
  getNotifications() {
    return this.appService.getNotifications();
  }

  @Post('notifications/send')
  sendNotification(@Body() body: { userId: string; channel: string; subject: string; message: string }) {
    return this.appService.sendNotification(body);
  }
}
