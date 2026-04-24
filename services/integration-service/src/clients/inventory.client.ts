import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { UpstreamServiceError } from "./upstream-service.error";

export interface CreatePropertyDto {
  name: string;
  type: string;
  city: string;
  countryCode: string;
  partnerId: string;
  stars?: number;
  neighborhood?: string;
  lat?: number;
  lon?: number;
  thumbnailUrl?: string;
  amenities?: string[];
}

export interface UpdatePropertyDto {
  name?: string;
  type?: string;
  city?: string;
  stars?: number;
  status?: string;
  neighborhood?: string;
  lat?: number;
  lon?: number;
  thumbnailUrl?: string;
  amenities?: string[];
}

export interface CreateRoomDto {
  roomType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
  bedType?: string;
  viewType?: string;
}

export interface UpdateRoomDto {
  roomType?: string;
  capacity?: number;
  totalRooms?: number;
  basePriceUsd?: number;
  status?: string;
}

export interface UpdateAvailabilityDto {
  date: string;
  available: boolean;
}

export interface UpdateRatesDto {
  fromDate: string;
  toDate: string;
  priceUsd: number;
  currency?: string;
}

@Injectable()
export class InventoryClient {
  private readonly logger = new Logger(InventoryClient.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.INVENTORY_SERVICE_URL ?? "http://localhost:3003";
  }

  async createProperty(dto: CreatePropertyDto): Promise<{ id: string }> {
    return this.post<{ id: string }>("/properties", dto);
  }

  async updateProperty(id: string, dto: UpdatePropertyDto): Promise<void> {
    await this.patch(`/properties/${id}`, dto);
  }

  async createRoom(
    propertyId: string,
    dto: CreateRoomDto,
  ): Promise<{ id: string }> {
    return this.post<{ id: string }>("/rooms", { ...dto, propertyId });
  }

  async updateRoom(id: string, dto: UpdateRoomDto): Promise<void> {
    await this.patch(`/rooms/${id}`, dto);
  }

  async updateAvailability(
    roomId: string,
    dto: UpdateAvailabilityDto,
  ): Promise<void> {
    const endpoint = dto.available
      ? "/availability/unblock"
      : "/availability/block";
    await this.post(endpoint, { roomId, fromDate: dto.date, toDate: dto.date });
  }

  async updateRates(roomId: string, dto: UpdateRatesDto): Promise<void> {
    await this.post(`/rooms/${roomId}/rates`, dto);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<T>(`${this.baseUrl}${path}`, body),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(
        `POST ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UpstreamServiceError("inventory-service", err);
    }
  }

  private async patch(path: string, body: unknown): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.patch(`${this.baseUrl}${path}`, body),
      );
    } catch (err: any) {
      this.logger.error(
        `PATCH ${path} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UpstreamServiceError("inventory-service", err);
    }
  }
}
