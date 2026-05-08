import { Injectable, Logger } from "@nestjs/common";

export interface InventoryProperty {
  id: string;
  name: string;
  type: string;
  city: string;
  countryCode: string;
  neighborhood: string | null;
  stars: number | null;
  status: string;
  partnerId: string;
  thumbnailUrl: string;
  createdAt: string;
}

export interface InventoryRoom {
  id: string;
  propertyId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: string;
  status: string;
}

export interface InventoryAvailabilityDay {
  date: string;
  totalRooms: number;
  reservedRooms: number;
  heldRooms: number;
  blocked: boolean;
  available: boolean;
}

export interface InventoryRatePeriod {
  id: string;
  roomId: string;
  fromDate: string;
  toDate: string;
  priceUsd: string;
  currency: string;
  createdAt: string;
}

@Injectable()
export class InventoryClientService {
  private readonly logger = new Logger(InventoryClientService.name);
  private readonly baseUrl =
    process.env.INVENTORY_SERVICE_URL ?? "http://localhost:3003";

  async listPropertiesByPartner(
    partnerId: string,
  ): Promise<InventoryProperty[]> {
    const url = new URL(`${this.baseUrl}/properties`);
    url.searchParams.set("partnerId", partnerId);
    const res = await fetch(url.toString());
    if (!res.ok) {
      this.logger.warn(
        `inventory-service list properties failed for partner ${partnerId} [${res.status}]`,
      );
      return [];
    }
    const data = (await res.json()) as
      | InventoryProperty[]
      | { properties?: InventoryProperty[] };
    return Array.isArray(data) ? data : (data.properties ?? []);
  }

  async listRoomsByProperty(propertyId: string): Promise<InventoryRoom[]> {
    const url = new URL(`${this.baseUrl}/rooms`);
    url.searchParams.set("propertyId", propertyId);
    const res = await fetch(url.toString());
    if (!res.ok) {
      this.logger.warn(
        `inventory-service list rooms failed for property ${propertyId} [${res.status}]`,
      );
      return [];
    }
    const data = (await res.json()) as
      | InventoryRoom[]
      | { rooms?: InventoryRoom[] };
    return Array.isArray(data) ? data : (data.rooms ?? []);
  }

  async getRoomById(roomId: string): Promise<InventoryRoom | null> {
    const res = await fetch(
      `${this.baseUrl}/rooms/${encodeURIComponent(roomId)}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      this.logger.warn(
        `inventory-service get room ${roomId} failed [${res.status}]`,
      );
      return null;
    }
    return res.json() as Promise<InventoryRoom>;
  }

  async getRoomAvailability(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<InventoryAvailabilityDay[]> {
    const url = new URL(`${this.baseUrl}/availability/calendar`);
    url.searchParams.set("roomId", roomId);
    url.searchParams.set("fromDate", fromDate);
    url.searchParams.set("toDate", toDate);
    const res = await fetch(url.toString());
    if (!res.ok) {
      this.logger.warn(
        `inventory-service availability failed for room ${roomId} [${res.status}]`,
      );
      return [];
    }
    const data = (await res.json()) as
      | InventoryAvailabilityDay[]
      | { days?: InventoryAvailabilityDay[] };
    return Array.isArray(data) ? data : (data.days ?? []);
  }

  async getRoomRates(
    roomId: string,
    propertyId: string,
    fromDate: string,
    toDate: string,
  ): Promise<InventoryRatePeriod[]> {
    const url = new URL(`${this.baseUrl}/rates`);
    url.searchParams.set("roomId", roomId);
    url.searchParams.set("propertyId", propertyId);
    url.searchParams.set("fromDate", fromDate);
    url.searchParams.set("toDate", toDate);
    const res = await fetch(url.toString());
    if (!res.ok) {
      this.logger.warn(
        `inventory-service rates failed for room ${roomId} [${res.status}]`,
      );
      return [];
    }
    const data = (await res.json()) as
      | InventoryRatePeriod[]
      | { rates?: InventoryRatePeriod[] };
    return Array.isArray(data) ? data : (data.rates ?? []);
  }

  async blockRoomDates(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/availability/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, fromDate, toDate }),
    });
    if (!res.ok) {
      this.logger.warn(
        `inventory-service block failed for room ${roomId} [${res.status}]`,
      );
    }
  }

  async unblockRoomDates(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/availability/unblock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, fromDate, toDate }),
    });
    if (!res.ok) {
      this.logger.warn(
        `inventory-service unblock failed for room ${roomId} [${res.status}]`,
      );
    }
  }

  async createRoomRate(
    roomId: string,
    fromDate: string,
    toDate: string,
    priceUsd: number,
  ): Promise<InventoryRatePeriod | null> {
    const res = await fetch(`${this.baseUrl}/rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, fromDate, toDate, priceUsd }),
    });
    if (!res.ok) {
      this.logger.warn(
        `inventory-service create rate failed for room ${roomId} [${res.status}]`,
      );
      return null;
    }
    return res.json() as Promise<InventoryRatePeriod>;
  }

  async getPropertyById(propertyId: string): Promise<InventoryProperty | null> {
    const res = await fetch(
      `${this.baseUrl}/properties/${encodeURIComponent(propertyId)}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      this.logger.warn(
        `inventory-service get property ${propertyId} failed [${res.status}]`,
      );
      return null;
    }
    return res.json() as Promise<InventoryProperty>;
  }
}
