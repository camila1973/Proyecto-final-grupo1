import { Injectable, Logger } from "@nestjs/common";
import { UpstreamServiceError } from "./upstream-service.error.js";

@Injectable()
export class BookingClient {
  private readonly logger = new Logger(BookingClient.name);
  private readonly baseUrl =
    process.env.BOOKING_SERVICE_URL ?? "http://localhost:3004";

  async submitReservation(reservationId: string): Promise<void> {
    try {
      const res = await fetch(
        `${this.baseUrl}/reservations/${reservationId}/submit`,
        { method: "PATCH" },
      );
      if (!res.ok) {
        throw new UpstreamServiceError("booking-service", `HTTP ${res.status}`);
      }
      this.logger.log(`Booking submitted: ${reservationId}`);
    } catch (err) {
      if (err instanceof UpstreamServiceError) throw err;
      throw new UpstreamServiceError("booking-service", err);
    }
  }

  async reholdReservation(reservationId: string): Promise<void> {
    try {
      const res = await fetch(
        `${this.baseUrl}/reservations/${reservationId}/rehold`,
        { method: "PATCH" },
      );
      if (!res.ok) {
        throw new UpstreamServiceError("booking-service", `HTTP ${res.status}`);
      }
      this.logger.log(`Booking rehold: ${reservationId}`);
    } catch (err) {
      if (err instanceof UpstreamServiceError) throw err;
      throw new UpstreamServiceError("booking-service", err);
    }
  }

  async confirmReservation(reservationId: string): Promise<void> {
    try {
      const res = await fetch(
        `${this.baseUrl}/reservations/${reservationId}/confirm`,
        { method: "PATCH" },
      );
      if (!res.ok) {
        throw new UpstreamServiceError("booking-service", `HTTP ${res.status}`);
      }
      this.logger.log(`Booking confirmed: ${reservationId}`);
    } catch (err) {
      if (err instanceof UpstreamServiceError) throw err;
      throw new UpstreamServiceError("booking-service", err);
    }
  }

  async failReservation(reservationId: string, reason: string): Promise<void> {
    try {
      const res = await fetch(
        `${this.baseUrl}/reservations/${reservationId}/fail`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      if (!res.ok) {
        throw new UpstreamServiceError("booking-service", `HTTP ${res.status}`);
      }
      this.logger.log(`Booking marked failed: ${reservationId}`);
    } catch (err) {
      if (err instanceof UpstreamServiceError) throw err;
      throw new UpstreamServiceError("booking-service", err);
    }
  }
}
