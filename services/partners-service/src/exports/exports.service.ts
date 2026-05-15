import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PaymentClientService } from "../clients/payment-client.service.js";
import { PartnersRepository } from "../partners/partners.repository.js";
import type { PaymentRow } from "../partners/dashboard.types.js";
import {
  capturedToPaymentRow,
  countNights,
} from "../partners/payment-row.mapper.js";
import type { DisbursementReportData, ReportData } from "./exports.types.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class ExportsService {
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

  async loadDisbursementReportData(
    partnerId: string,
    from: string,
    to: string,
    propertyId: string | null,
  ): Promise<DisbursementReportData> {
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

    const partner = await this.partnersRepo.findById(partnerId);
    const history = await this.paymentClient.getDisbursementHistory(
      partnerId,
      from,
      to,
      propertyId ?? undefined,
    );
    if (!history) {
      throw new ServiceUnavailableException(
        "payment-service unavailable; cannot build disbursement report",
      );
    }

    const propertyName = propertyId
      ? (history.months[0]?.byProperty.find((p) => p.propertyId === propertyId)
          ?.propertyName ?? null)
      : null;

    return {
      header: {
        partnerId,
        partnerName: partner.name,
        propertyId,
        propertyName,
        from,
        to,
        generatedAt: new Date().toISOString(),
        currency: "USD",
      },
      totals: {
        ...history.totals,
        paymentCount: history.paymentCount,
      },
      months: history.months,
    };
  }
}

// Re-export for tests
export { countNights };
