import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PaymentClientService } from "../clients/payment-client.service.js";
import { PartnersRepository } from "../partners/partners.repository.js";
import type {
  CapturedPaymentDto,
  PaymentRow,
} from "../partners/dashboard.types.js";
import {
  countNights,
  mapSnapshotToPaymentRow,
} from "../partners/payment-row.mapper.js";
import type { ReportData } from "./report.types.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class ReportsService {
  constructor(
    private readonly paymentClient: PaymentClientService,
    private readonly partnersRepo: PartnersRepository,
  ) {}

  async loadReportData(
    partnerId: string,
    from: string,
    to: string,
    propertyId: string | null,
  ): Promise<ReportData> {
    if (!DATE_REGEX.test(from)) {
      throw new BadRequestException("'from' must be YYYY-MM-DD");
    }
    if (!DATE_REGEX.test(to)) {
      throw new BadRequestException("'to' must be YYYY-MM-DD");
    }
    const fromMs = Date.parse(`${from}T00:00:00.000Z`);
    const toMs = Date.parse(`${to}T00:00:00.000Z`);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
      throw new BadRequestException("Invalid date");
    }
    if (toMs <= fromMs) {
      throw new BadRequestException("'to' must be after 'from'");
    }
    if (toMs - fromMs > 366 * 86_400_000) {
      throw new BadRequestException("Range must be 366 days or less");
    }

    // Fetch partner (also asserts existence — throws 404 otherwise).
    const partner = await this.partnersRepo.findById(partnerId);

    const captured = await this.paymentClient.getCapturedByPartner(
      partnerId,
      from,
      to,
      propertyId ?? undefined,
    );
    if (!captured) {
      throw new ServiceUnavailableException(
        "payment-service unavailable; cannot build report",
      );
    }

    const rows: PaymentRow[] = captured.rows.map((r) =>
      capturedToPaymentRow(r),
    );

    const propertyName =
      propertyId && rows.length > 0 ? (rows[0]?.propertyName ?? null) : null;

    return {
      header: {
        partnerId,
        partnerName: partner.name,
        propertyId: propertyId,
        propertyName,
        from,
        to,
        generatedAt: new Date().toISOString(),
        currency: "USD",
      },
      totals: {
        grossUsd: captured.totals.grossUsd,
        taxUsd: captured.totals.taxUsd,
        commissionUsd: captured.totals.commissionUsd,
        netUsd: captured.totals.netUsd,
        count: captured.totals.count,
      },
      rows,
    };
  }
}

function capturedToPaymentRow(r: CapturedPaymentDto): PaymentRow {
  const snapshot = r.fareSnapshot as {
    nights?: number;
    roomRateUsd?: number;
  } | null;
  const nights =
    typeof snapshot?.nights === "number" && snapshot.nights > 0
      ? snapshot.nights
      : nightsFromFareSnapshot(r);
  return mapSnapshotToPaymentRow(
    {
      propertyId: r.propertyId,
      propertyName: r.propertyName,
      status: r.status,
      stripePaymentIntentId: r.stripePaymentIntentId,
      grossAmountUsd: r.grossAmountUsd,
      taxAmountUsd: r.taxAmountUsd,
      commissionAmountUsd: r.commissionAmountUsd,
      netPayoutUsd: r.netPayoutUsd,
      amountUsd: r.grossAmountUsd,
      createdAt: r.capturedAt ?? r.createdAt,
    },
    {
      reservationId: r.reservationId,
      propertyId: r.propertyId ?? "",
      propertyName: r.propertyName ?? "",
      status: r.status,
      grandTotalUsd: r.grossAmountUsd,
      createdAt: r.createdAt,
    },
    nights,
  );
}

function nightsFromFareSnapshot(r: CapturedPaymentDto): number {
  // Some legacy snapshots store nights as a string or omit it; if missing,
  // we cannot recover from a single payment row alone, so return 0 and let
  // ratePerNight be 0 in the report. Subtotal/total still flow through.
  if (!r.fareSnapshot) return 0;
  const n = (r.fareSnapshot as { nights?: unknown }).nights;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
  if (typeof n === "string") {
    const parsed = Number(n);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

// Re-export for tests
export { countNights };
