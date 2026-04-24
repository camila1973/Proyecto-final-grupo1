import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { CacheService } from "../cache/cache.service.js";
import { InventoryClient } from "../clients/inventory.client.js";
import { CreateHoldDto } from "./dto/create-hold.dto.js";

const HOLD_TTL_SECONDS = 900; // 15 minutes

export interface HoldResponse {
  holdId: string;
  expiresAt: string;
}

interface HoldPayload {
  holdId: string;
  bookerId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  expiresAt: string;
}

function idempotencyKey(dto: CreateHoldDto): string {
  return `booking:hold:idempotency:${dto.bookerId}:${dto.roomId}:${dto.checkIn}:${dto.checkOut}`;
}

function byIdKey(holdId: string): string {
  return `booking:hold:by-id:${holdId}`;
}

@Injectable()
export class HoldsService {
  constructor(
    private readonly cache: CacheService,
    private readonly inventoryClient: InventoryClient,
  ) {}

  async create(dto: CreateHoldDto): Promise<HoldResponse> {
    const idempKey = idempotencyKey(dto);
    const holdId = randomUUID();
    const expiresAt = new Date(
      Date.now() + HOLD_TTL_SECONDS * 1000,
    ).toISOString();

    const payload: HoldPayload = {
      holdId,
      bookerId: dto.bookerId,
      roomId: dto.roomId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      expiresAt,
    };

    const acquired = await this.cache.setIfAbsent(
      idempKey,
      JSON.stringify(payload),
      HOLD_TTL_SECONDS,
    );

    if (acquired) {
      try {
        await this.inventoryClient.hold(dto.roomId, dto.checkIn, dto.checkOut);
      } catch (err) {
        // Inventory rejected the hold — remove the key so future attempts can retry
        await this.cache.del(idempKey);
        throw err;
      }
      await this.cache.set(byIdKey(holdId), idempKey, HOLD_TTL_SECONDS);
      return { holdId, expiresAt };
    }

    // Key already exists — idempotent: return the existing hold
    const existing = await this.cache.get(idempKey);
    if (!existing) {
      // Race: key expired between setIfAbsent and get — retry once
      return this.create(dto);
    }

    const parsed = JSON.parse(existing) as HoldPayload;
    return { holdId: parsed.holdId, expiresAt: parsed.expiresAt };
  }

  async release(holdId: string): Promise<void> {
    const idempKey = await this.cache.getAndDelete(byIdKey(holdId));
    if (!idempKey) {
      throw new NotFoundException(
        `Hold ${holdId} not found or already released`,
      );
    }

    const holdRaw = await this.cache.getAndDelete(idempKey);
    if (!holdRaw) {
      // Already consumed by a reservation creation — no inventory unhold needed
      return;
    }

    const parsed = JSON.parse(holdRaw) as HoldPayload;
    await this.inventoryClient.unhold(
      parsed.roomId,
      parsed.checkIn,
      parsed.checkOut,
    );
  }
}
