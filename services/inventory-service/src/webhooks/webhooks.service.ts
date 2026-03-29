import { Injectable, Logger } from "@nestjs/common";
import { RoomsRepository } from "../rooms/rooms.repository";
import { RoomRatesService } from "../room-rates/room-rates.service";
import { AvailabilityRepository } from "../availability/availability.repository";
import { PropertiesRepository } from "../properties/properties.repository";
import { EventsPublisher } from "../events/events.publisher";
import {
  HotelbedsWebhookDto,
  TravelClickWebhookDto,
  RoomRaccoonWebhookDto,
  WebhookResult,
} from "./webhooks.types";

// Static FX rates (override with live rates via CURRENCY_API_KEY)
const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  BRL: 0.2,
  MXN: 0.058,
  ARS: 0.0011,
  COP: 0.00025,
  CLP: 0.0011,
};

function toUsd(amount: number, currency: string): number {
  const rate = FX_TO_USD[currency.toUpperCase()] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

function normalizeRoomType(code: string): string {
  const map: Record<string, string> = {
    SGL: "single",
    DBL: "double",
    TWN: "double",
    TPL: "triple",
    QDR: "quadruple",
    STE: "suite",
    DLX: "deluxe",
    JNR: "junior_suite",
    STD: "standard",
  };
  return map[code.toUpperCase()] ?? code.toLowerCase();
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly propertiesRepo: PropertiesRepository,
    private readonly roomsRepo: RoomsRepository,
    private readonly ratesService: RoomRatesService,
    private readonly availabilityRepo: AvailabilityRepository,
    private readonly events: EventsPublisher,
  ) {}

  async processHotelbeds(payload: HotelbedsWebhookDto): Promise<WebhookResult> {
    const start = Date.now();
    let processed = 0;
    let skipped = 0;

    const property = await this.propertiesRepo.findByName(payload.hotelCode);
    if (!property) {
      this.logger.warn(
        `Hotelbeds: no property for hotelCode=${payload.hotelCode}`,
      );
      return {
        processed: 0,
        skipped: payload.rooms.length,
        durationMs: Date.now() - start,
      };
    }

    for (const room of payload.rooms) {
      const roomType = normalizeRoomType(room.roomCode);
      const dbRoom = await this.roomsRepo.findByPropertyAndType(
        property.id,
        roomType,
      );
      if (!dbRoom) {
        skipped++;
        continue;
      }

      if (!room.stopSell && room.allotment > 0 && room.rate) {
        try {
          await this.ratesService.create(dbRoom.id, property.partner_id, {
            roomId: dbRoom.id,
            fromDate: room.date,
            toDate: nextDay(room.date),
            priceUsd: toUsd(room.rate, room.currency ?? "USD"),
            currency: room.currency ?? "USD",
          });
        } catch {
          /* overlap is non-fatal */
        }
      }

      if (room.stopSell) {
        await this.availabilityRepo.blockDates(
          dbRoom.id,
          room.date,
          nextDay(room.date),
        );
      } else {
        await this.availabilityRepo.unblockDates(
          dbRoom.id,
          room.date,
          nextDay(room.date),
        );
      }

      this.events.publish("inventory.room.updated", {
        routingKey: "inventory.room.updated",
        timestamp: new Date().toISOString(),
        roomId: dbRoom.id,
        propertyId: property.id,
      });
      processed++;
    }

    this.logger.log(
      `Hotelbeds: processed=${processed} skipped=${skipped} in ${Date.now() - start}ms`,
    );
    return { processed, skipped, durationMs: Date.now() - start };
  }

  async processTravelClick(
    payload: TravelClickWebhookDto,
  ): Promise<WebhookResult> {
    const start = Date.now();
    let processed = 0;
    let skipped = 0;

    const property = await this.propertiesRepo.findByName(payload.propertyCode);
    if (!property) {
      this.logger.warn(
        `TravelClick: no property for propertyCode=${payload.propertyCode}`,
      );
      return {
        processed: 0,
        skipped: payload.roomTypes.length,
        durationMs: Date.now() - start,
      };
    }

    for (const rt of payload.roomTypes) {
      const roomType = normalizeRoomType(rt.roomTypeCode);
      const dbRoom = await this.roomsRepo.findByPropertyAndType(
        property.id,
        roomType,
      );
      if (!dbRoom) {
        skipped++;
        continue;
      }

      if (!rt.closed && rt.availableCount > 0 && rt.rateAmount) {
        try {
          await this.ratesService.create(dbRoom.id, property.partner_id, {
            roomId: dbRoom.id,
            fromDate: rt.startDate,
            toDate: rt.endDate,
            priceUsd: toUsd(rt.rateAmount, rt.currencyCode ?? "USD"),
            currency: rt.currencyCode ?? "USD",
          });
        } catch {
          /* overlap is non-fatal */
        }
      }

      if (rt.closed) {
        await this.availabilityRepo.blockDates(
          dbRoom.id,
          rt.startDate,
          rt.endDate,
        );
      } else {
        await this.availabilityRepo.unblockDates(
          dbRoom.id,
          rt.startDate,
          rt.endDate,
        );
      }

      this.events.publish("inventory.room.updated", {
        routingKey: "inventory.room.updated",
        timestamp: new Date().toISOString(),
        roomId: dbRoom.id,
        propertyId: property.id,
      });
      processed++;
    }

    this.logger.log(
      `TravelClick: processed=${processed} skipped=${skipped} in ${Date.now() - start}ms`,
    );
    return { processed, skipped, durationMs: Date.now() - start };
  }

  async processRoomRaccoon(
    payload: RoomRaccoonWebhookDto,
  ): Promise<WebhookResult> {
    const start = Date.now();
    let processed = 0;
    let skipped = 0;

    const property = await this.propertiesRepo.findByName(payload.hotelId);
    if (!property) {
      this.logger.warn(
        `RoomRaccoon: no property for hotelId=${payload.hotelId}`,
      );
      return {
        processed: 0,
        skipped: payload.availability.length,
        durationMs: Date.now() - start,
      };
    }

    for (const av of payload.availability) {
      const dbRoom = await this.roomsRepo.findByPropertyAndType(
        property.id,
        av.roomId,
      );
      if (!dbRoom) {
        skipped++;
        continue;
      }

      if (av.available && av.price) {
        try {
          await this.ratesService.create(dbRoom.id, property.partner_id, {
            roomId: dbRoom.id,
            fromDate: av.date,
            toDate: nextDay(av.date),
            priceUsd: toUsd(av.price, av.currency ?? "USD"),
            currency: av.currency ?? "USD",
          });
        } catch {
          /* overlap is non-fatal */
        }
      }

      if (!av.available) {
        await this.availabilityRepo.blockDates(
          dbRoom.id,
          av.date,
          nextDay(av.date),
        );
      } else {
        await this.availabilityRepo.unblockDates(
          dbRoom.id,
          av.date,
          nextDay(av.date),
        );
      }

      this.events.publish("inventory.room.updated", {
        routingKey: "inventory.room.updated",
        timestamp: new Date().toISOString(),
        roomId: dbRoom.id,
        propertyId: property.id,
      });
      processed++;
    }

    this.logger.log(
      `RoomRaccoon: processed=${processed} skipped=${skipped} in ${Date.now() - start}ms`,
    );
    return { processed, skipped, durationMs: Date.now() - start };
  }
}
