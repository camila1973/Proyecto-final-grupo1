import { Injectable, Logger } from "@nestjs/common";
import type {
  CapturedPaymentsResponse,
  DisbursementDto,
  DisbursementHistoryResponse,
  PaymentDto,
} from "../partners/dashboard.types.js";

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
    const data = (await res.json()) as Partial<PaymentDto>;
    return {
      id: data.id ?? "",
      reservationId,
      status: data.status ?? "unknown",
      amountUsd: data.amountUsd ?? 0,
      currency: data.currency ?? "USD",
      guestEmail: data.guestEmail ?? null,
      stripePaymentIntentId: data.stripePaymentIntentId ?? null,
      createdAt: data.createdAt ?? new Date().toISOString(),
      partnerId: data.partnerId ?? null,
      propertyId: data.propertyId ?? null,
      propertyName: data.propertyName ?? null,
      grossAmountUsd: data.grossAmountUsd ?? null,
      taxAmountUsd: data.taxAmountUsd ?? null,
      partnerFeeUsd: data.partnerFeeUsd ?? null,
      commissionRate: data.commissionRate ?? null,
      commissionAmountUsd: data.commissionAmountUsd ?? null,
      netPayoutUsd: data.netPayoutUsd ?? null,
      capturedAt: data.capturedAt ?? null,
    };
  }

  async getCapturedByPartner(
    partnerId: string,
    from: string,
    to: string,
    propertyId?: string,
  ): Promise<CapturedPaymentsResponse | null> {
    const params = new URLSearchParams({ from, to });
    if (propertyId) params.set("propertyId", propertyId);
    const url = `${this.baseUrl}/payments/by-partner/${encodeURIComponent(partnerId)}/captured?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warn(
        `payment-service captured-by-partner fetch failed for ${partnerId} ${from}..${to} [${res.status}]`,
      );
      return null;
    }
    return (await res.json()) as CapturedPaymentsResponse;
  }

  async getDisbursementHistory(
    partnerId: string,
    from: string,
    to: string,
    propertyId?: string,
  ): Promise<DisbursementHistoryResponse | null> {
    const params = new URLSearchParams({ from, to });
    if (propertyId) params.set("propertyId", propertyId);
    const url = `${this.baseUrl}/disbursements/by-partner/${encodeURIComponent(partnerId)}/history?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warn(
        `payment-service disbursement-history fetch failed for ${partnerId} ${from}..${to} [${res.status}]`,
      );
      return null;
    }
    return (await res.json()) as DisbursementHistoryResponse;
  }

  async getDisbursement(
    partnerId: string,
    month: string,
  ): Promise<DisbursementDto | null> {
    const url = `${this.baseUrl}/disbursements/by-partner/${encodeURIComponent(partnerId)}?month=${encodeURIComponent(month)}`;
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warn(
        `payment-service disbursement fetch failed for ${partnerId} ${month} [${res.status}]`,
      );
      return null;
    }
    return (await res.json()) as DisbursementDto;
  }
}
