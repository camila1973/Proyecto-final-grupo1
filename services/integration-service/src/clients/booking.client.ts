import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { UpstreamServiceError } from "./upstream-service.error";

export interface CreateBookingDto {
  propertyId: string;
  roomId: string;
  partnerId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalPriceUsd: number;
  externalBookingId?: string;
}

export interface CreateHoldDto {
  roomId: string;
  partnerId: string;
  checkIn: string;
  checkOut: string;
  externalHoldId?: string;
}

@Injectable()
export class BookingClient {
  private readonly logger = new Logger(BookingClient.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.BOOKING_SERVICE_URL ?? "http://localhost:3004";
  }

  async createBooking(dto: CreateBookingDto): Promise<{ id: string }> {
    return this.post<{ id: string }>("/bookings", dto);
  }

  async createHold(dto: CreateHoldDto): Promise<{ id: string }> {
    return this.post<{ id: string }>("/holds", dto);
  }

  async releaseHold(holdId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/holds/${holdId}`),
      );
    } catch (err: any) {
      this.logger.error(
        `DELETE /holds/${holdId} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UpstreamServiceError("booking-service", err);
    }
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
      throw new UpstreamServiceError("booking-service", err);
    }
  }
}
