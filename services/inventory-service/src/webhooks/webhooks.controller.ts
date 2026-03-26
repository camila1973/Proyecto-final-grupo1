import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service.js';
import { HotelbedsWebhookDto } from './dto/hotelbeds-webhook.dto.js';
import { TravelClickWebhookDto } from './dto/travelclick-webhook.dto.js';
import { RoomRaccoonWebhookDto } from './dto/roomraccoon-webhook.dto.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('hotelbeds')
  @HttpCode(HttpStatus.OK)
  hotelbeds(@Body() payload: HotelbedsWebhookDto) {
    if (!payload?.hotelCode || !Array.isArray(payload.rooms)) {
      throw new BadRequestException('Invalid Hotelbeds payload');
    }
    return this.webhooksService.processHotelbeds(payload);
  }

  @Post('travelclick')
  @HttpCode(HttpStatus.OK)
  travelclick(@Body() payload: TravelClickWebhookDto) {
    if (!payload?.propertyCode || !Array.isArray(payload.roomTypes)) {
      throw new BadRequestException('Invalid TravelClick payload');
    }
    return this.webhooksService.processTravelClick(payload);
  }

  @Post('roomraccoon')
  @HttpCode(HttpStatus.OK)
  roomraccoon(@Body() payload: RoomRaccoonWebhookDto) {
    if (!payload?.hotelId || !Array.isArray(payload.availability)) {
      throw new BadRequestException('Invalid RoomRaccoon payload');
    }
    return this.webhooksService.processRoomRaccoon(payload);
  }
}
