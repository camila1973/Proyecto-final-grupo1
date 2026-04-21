import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../cache/cache.service.js";
import { InventoryClient } from "./inventory.client.js";

export interface RoomLocation {
  country: string;
  city: string;
}

// Location data is static — rooms don't move. 7-day TTL is conservative.
const TTL_SECONDS = 60 * 60 * 24 * 7;

function cacheKey(roomId: string): string {
  return `booking:room-location:${roomId}`;
}

@Injectable()
export class RoomLocationCacheService {
  private readonly logger = new Logger(RoomLocationCacheService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly inventoryClient: InventoryClient,
  ) {}

  async upsert(roomId: string, location: RoomLocation): Promise<void> {
    await this.cache.set(
      cacheKey(roomId),
      JSON.stringify(location),
      TTL_SECONDS,
    );
  }

  async findByRoomId(roomId: string): Promise<RoomLocation> {
    const cached = await this.cache.get(cacheKey(roomId));
    if (cached) {
      return JSON.parse(cached) as RoomLocation;
    }

    this.logger.debug(
      `Cache miss for room ${roomId} — fetching from inventory-service`,
    );
    const location = await this.inventoryClient.getRoomLocation(roomId);
    await this.upsert(roomId, location);
    return location;
  }
}
