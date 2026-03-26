import { Injectable, Logger } from '@nestjs/common';
import { AvailabilityRecord, AvailabilityStore } from './availability.store.js';
import { HotelbedsWebhookDto } from './dto/hotelbeds-webhook.dto.js';
import { TravelClickWebhookDto } from './dto/travelclick-webhook.dto.js';
import { RoomRaccoonWebhookDto } from './dto/roomraccoon-webhook.dto.js';

export interface WebhookResult {
  processed: number;
  skipped: number;
  durationMs: number;
}

// Expand multi-day TravelClick ranges into per-day SKUs
function expandDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly store: AvailabilityStore) {}

  processHotelbeds(payload: HotelbedsWebhookDto): WebhookResult {
    const start = Date.now();
    const records: AvailabilityRecord[] = payload.rooms.map((room) => ({
      skuId: `${payload.hotelCode}:${room.roomCode}:${room.date}`,
      propertyId: payload.hotelCode,
      roomId: room.roomCode,
      date: room.date,
      available: !room.stopSell && room.allotment > 0,
      allotment: room.allotment,
      price: room.rate,
      currency: room.currency,
      stopSell: room.stopSell,
      updatedAt: new Date(payload.timestamp),
      source: 'hotelbeds',
    }));

    this.store.upsertBatch(records);
    const durationMs = Date.now() - start;
    this.logger.log(
      `Hotelbeds: processed ${records.length} SKUs for hotel ${payload.hotelCode} in ${durationMs}ms`,
    );
    return { processed: records.length, skipped: 0, durationMs };
  }

  processTravelClick(payload: TravelClickWebhookDto): WebhookResult {
    const start = Date.now();
    const records: AvailabilityRecord[] = [];

    for (const roomType of payload.roomTypes) {
      const dates = expandDateRange(roomType.startDate, roomType.endDate);
      for (const date of dates) {
        records.push({
          skuId: `${payload.propertyCode}:${roomType.roomTypeCode}:${date}`,
          propertyId: payload.propertyCode,
          roomId: roomType.roomTypeCode,
          date,
          available: !roomType.closed && roomType.availableCount > 0,
          allotment: roomType.availableCount,
          price: roomType.rateAmount,
          currency: roomType.currencyCode,
          stopSell: roomType.closed,
          updatedAt: new Date(payload.createdAt),
          source: 'travelclick',
        });
      }
    }

    this.store.upsertBatch(records);
    const durationMs = Date.now() - start;
    this.logger.log(
      `TravelClick: processed ${records.length} SKUs for property ${payload.propertyCode} in ${durationMs}ms`,
    );
    return { processed: records.length, skipped: 0, durationMs };
  }

  processRoomRaccoon(payload: RoomRaccoonWebhookDto): WebhookResult {
    const start = Date.now();
    const records: AvailabilityRecord[] = payload.availability.map((item) => ({
      skuId: `${payload.hotelId}:${item.roomId}:${item.date}`,
      propertyId: payload.hotelId,
      roomId: item.roomId,
      date: item.date,
      available: item.available,
      allotment: item.available ? 1 : 0,
      price: item.price,
      currency: item.currency,
      stopSell: !item.available,
      updatedAt: new Date(payload.occurredAt),
      source: 'roomraccoon',
    }));

    this.store.upsertBatch(records);
    const durationMs = Date.now() - start;
    this.logger.log(
      `RoomRaccoon: processed ${records.length} SKUs for hotel ${payload.hotelId} in ${durationMs}ms`,
    );
    return { processed: records.length, skipped: 0, durationMs };
  }
}
