import { Injectable, Logger } from "@nestjs/common";
import type { PaymentDto } from "../dashboard/dashboard.types.js";

@Injectable()
export class PaymentClientService {
  private readonly logger = new Logger(PaymentClientService.name);
  private readonly baseUrl =
    process.env.PAYMENT_SERVICE_URL ?? "http://localhost:3005";

  async getStatus(reservationId: string): Promise<PaymentDto | null> {
    const res = await fetch(
      `${this.baseUrl}/payments/${encodeURIComponent(reservationId)}/status`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      this.logger.warn(
        `payment-service status fetch failed for ${reservationId} [${res.status}]`,
      );
      return null;
    }
    const data = (await res.json()) as Partial<PaymentDto> & {
      status?: string;
      amountUsd?: number;
      currency?: string;
      stripePaymentIntentId?: string;
      guestEmail?: string;
      createdAt?: string;
      id?: string;
    };
    return {
      id: data.id ?? "",
      reservationId,
      status: data.status ?? "unknown",
      amountUsd: data.amountUsd ?? 0,
      currency: data.currency ?? "USD",
      guestEmail: data.guestEmail ?? null,
      stripePaymentIntentId: data.stripePaymentIntentId ?? null,
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  }
}
