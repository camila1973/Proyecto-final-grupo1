import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { UpstreamServiceError } from "./upstream-service.error.js";

export interface RefundOutcome {
  status: "succeeded" | "skipped";
  policy: "full_refund" | "partial_refund" | "no_refund";
  refundedUsd: number;
  externalRef: string | null;
  adjustmentId: string;
}

export interface RequestRefundInput {
  reservationId: string;
  reason: string;
  actorId: string | null;
  actorRole: string | null;
  requestIp: string | null;
}

@Injectable()
export class PaymentClient {
  private readonly logger = new Logger(PaymentClient.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl =
      process.env["PAYMENT_SERVICE_URL"] ?? "http://localhost:3005";
  }

  async requestRefund(input: RequestRefundInput): Promise<RefundOutcome> {
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (input.requestIp) headers["x-forwarded-for"] = input.requestIp;

      const res = await firstValueFrom(
        this.httpService.post<RefundOutcome>(
          `${this.baseUrl}/payments/${input.reservationId}/refund`,
          {
            reason: input.reason,
            actorId: input.actorId,
            actorRole: input.actorRole,
          },
          { headers },
        ),
      );
      return res.data;
    } catch (err) {
      this.logger.error(
        `requestRefund failed for reservation ${input.reservationId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UpstreamServiceError("payment-service", err);
    }
  }
}
