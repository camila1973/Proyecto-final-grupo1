import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { CacheService } from "../cache/cache.service.js";
import { UpstreamServiceError } from "./upstream-service.error.js";

export interface RoomLocation {
  country: string;
  city: string;
}

interface RatePeriod {
  fromDate: string;
  toDate: string;
  priceUsd: string;
}

// Location data is static — rooms don't move. 7-day TTL is conservative.
const LOCATION_TTL_SECONDS = 60 * 60 * 24 * 7;

function locationCacheKey(roomId: string): string {
  return `booking:room-location:${roomId}`;
}

@Injectable()
export class InventoryClient {
  private readonly logger = new Logger(InventoryClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly cache: CacheService,
  ) {
    this.baseUrl = process.env.INVENTORY_SERVICE_URL ?? "http://localhost:3003";
  }

  async getRoomLocation(roomId: string): Promise<RoomLocation> {
    const cached = await this.cache.get(locationCacheKey(roomId));
    if (cached) return JSON.parse(cached) as RoomLocation;

    this.logger.debug(
      `Cache miss for room ${roomId} — fetching from inventory-service`,
    );
    const room = await this.get<{ country: string; city: string }>(
      `/rooms/${roomId}`,
    );
    const location: RoomLocation = { country: room.country, city: room.city };
    await this.cacheRoomLocation(roomId, location);
    return location;
  }

  async cacheRoomLocation(
    roomId: string,
    location: RoomLocation,
  ): Promise<void> {
    await this.cache.set(
      locationCacheKey(roomId),
      JSON.stringify(location),
      LOCATION_TTL_SECONDS,
    );
  }

  /**
   * Returns the effective per-night rate in USD for the given stay.
   * Handles multi-period stays by computing the weighted subtotal across
   * all covering periods and dividing by total nights.
   */
  async getRateForStay(
    propertyId: string,
    roomId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<number> {
    const fromDate = checkIn.toISOString().slice(0, 10);
    const toDate = checkOut.toISOString().slice(0, 10);

    const periods = await this.get<RatePeriod[]>("/rates", {
      propertyId,
      roomId,
      fromDate,
      toDate,
    });

    if (!periods || periods.length === 0) {
      throw new NotFoundException(
        `No rates found for room ${roomId} covering ${fromDate} to ${toDate}.`,
      );
    }

    periods.sort((a, b) => a.fromDate.localeCompare(b.fromDate));

    const nights = this.daysBetween(checkIn, checkOut);
    let subtotalUsd = 0;
    let cursor = fromDate;

    for (const period of periods) {
      const periodStart = period.fromDate > cursor ? period.fromDate : cursor;
      const periodEnd = period.toDate < toDate ? period.toDate : toDate;

      if (periodStart >= periodEnd) continue;

      if (periodStart > cursor) {
        throw new NotFoundException(
          `Rate gap for room ${roomId}: no rate covers ${cursor} to ${periodStart}.`,
        );
      }

      subtotalUsd +=
        this.daysBetween(new Date(periodStart), new Date(periodEnd)) *
        parseFloat(period.priceUsd);
      cursor = periodEnd;
    }

    if (cursor < toDate) {
      throw new NotFoundException(
        `Rate gap for room ${roomId}: no rate covers ${cursor} to ${toDate}.`,
      );
    }

    return Math.round((subtotalUsd / nights) * 100) / 100;
  }

  async hold(roomId: string, fromDate: string, toDate: string): Promise<void> {
    await this.post("/availability/hold", { roomId, fromDate, toDate });
  }

  async unhold(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.post("/availability/unhold", { roomId, fromDate, toDate });
  }

  async confirmHold(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.post("/availability/confirm", { roomId, fromDate, toDate });
  }

  async release(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.post("/availability/release", { roomId, fromDate, toDate });
  }

  private async get<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${path}`, { params }),
      );
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;
      if (status === 404) {
        throw new NotFoundException(
          `Resource not found at inventory-service: ${path}`,
        );
      }
      this.logger.error(
        `GET ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UpstreamServiceError("inventory-service", err);
    }
  }

  private async post(
    path: string,
    body: Record<string, string>,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}${path}`, body),
      );
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;
      if (status === 409) {
        throw new ConflictException(
          err?.response?.data?.message ?? "No availability",
        );
      }
      if (status === 404) {
        throw new NotFoundException(
          `Resource not found at inventory-service: ${path}`,
        );
      }
      this.logger.error(
        `POST ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UpstreamServiceError("inventory-service", err);
    }
  }

  private daysBetween(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  }
}
