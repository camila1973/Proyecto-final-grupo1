import { Injectable, Logger } from "@nestjs/common";
import type {
  CapturedPaymentsResponse,
  DisbursementHistoryResponse,
} from "../partners/dashboard.types.js";

@Injectable()
export class PaymentClientService {
  private readonly logger = new Logger(PaymentClientService.name);
  private readonly baseUrl =
    process.env.PAYMENT_SERVICE_URL ?? "http://localhost:3005";

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
}
