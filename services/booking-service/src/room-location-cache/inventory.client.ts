import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { RoomLocation } from "./room-location-cache.service.js";

@Injectable()
export class InventoryClient {
  private readonly logger = new Logger(InventoryClient.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.INVENTORY_SERVICE_URL ?? "http://localhost:3003";
  }

  async getRoomLocation(roomId: string): Promise<RoomLocation> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<{ country: string; city: string }>(
          `${this.baseUrl}/rooms/${roomId}`,
        ),
      );
      return { country: res.data.country, city: res.data.city };
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        throw new NotFoundException(
          `Room ${roomId} not found in inventory-service.`,
        );
      }
      this.logger.error(
        `Failed to fetch room location for ${roomId}: ${String(err)}`,
      );
      throw err;
    }
  }
}
