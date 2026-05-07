import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import Stripe from "stripe";
import { PaymentsRepository } from "./payments.repository.js";
import { BookingClient } from "../clients/booking.client.js";
import { NotificationClient } from "../clients/notification.client.js";
import { UpstreamServiceError } from "../clients/upstream-service.error.js";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto.js";
import { CommissionRulesService } from "../commission-rules/commission-rules.service.js";

// Minimal shapes extracted from the Stripe SDK objects we actually use.
// Avoids namespace access issues under nodenext module resolution.
interface StripePaymentIntent {
  id: string;
  amount: number;
  metadata: Record<string, string>;
  payment_method: string | { id: string } | null;
  last_payment_error?: { message?: string } | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly booking: BookingClient,
    private readonly notifications: NotificationClient,
    private readonly commissionRules: CommissionRulesService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
    this.stripe = new Stripe(secretKey);
  }

  async initiate(dto: InitiatePaymentDto) {
    const amountCents = Math.round(dto.amountUsd * 100);

    // Determine if this is a retry (prior failed attempt exists)
    const existing = await this.repo.findByReservationId(dto.reservationId);
    const isRetry = !!existing;

    // Re-acquire inventory hold before creating a new Stripe intent on retry
    if (isRetry) {
      await this.booking.reholdReservation(dto.reservationId);
    }

    // Snapshot the fare breakdown from booking-service so each payment row
    // is self-contained for audit. We use this data to compute commission
    // here rather than recomputing from totals at read time.
    const reservation = await this.booking.getReservation(dto.reservationId);
    if (
      Math.round(reservation.grandTotalUsd * 100) !==
      Math.round(dto.amountUsd * 100)
    ) {
      throw new BadRequestException(
        `Amount ${dto.amountUsd} does not match reservation total ${reservation.grandTotalUsd}`,
      );
    }

    const checkInDate = new Date().toISOString().slice(0, 10);
    const commissionRate = await this.commissionRules.resolveRate(
      reservation.partnerId,
      checkInDate,
    );
    const commissionAmount = round2(reservation.grandTotalUsd * commissionRate);
    const netPayout = round2(reservation.grandTotalUsd - commissionAmount);

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: dto.currency.toLowerCase(),
      metadata: {
        reservation_id: dto.reservationId,
        guest_email: dto.guestEmail,
      },
      receipt_email: dto.guestEmail,
    });

    // Transition held → submitted
    await this.booking.submitReservation(dto.reservationId);

    const payment = await this.repo.create({
      reservation_id: dto.reservationId,
      stripe_payment_intent_id: intent.id,
      stripe_payment_method_id: null,
      amount_usd: dto.amountUsd,
      currency: dto.currency.toLowerCase(),
      status: "pending",
      failure_reason: null,
      guest_email: dto.guestEmail,
      partner_id: reservation.partnerId,
      property_id: reservation.propertyId,
      property_name: reservation.snapshot?.propertyName ?? "",
      gross_amount_usd: dto.amountUsd,
      tax_amount_usd: reservation.taxTotalUsd,
      partner_fee_usd: reservation.feeTotalUsd,
      commission_rate: commissionRate,
      commission_amount_usd: commissionAmount,
      net_payout_usd: netPayout,
      fare_snapshot: reservation.fareBreakdown ?? undefined,
    });

    return {
      paymentId: payment.id,
      clientSecret: intent.client_secret,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

    let event: ReturnType<typeof this.stripe.webhooks.constructEvent>;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException("Invalid webhook signature");
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
      await this.onPaymentSucceeded(event.data.object as StripePaymentIntent);
    } else if (event.type === "payment_intent.payment_failed") {
      await this.onPaymentFailed(event.data.object as StripePaymentIntent);
    }
  }

  async getStatus(reservationId: string) {
    const payment = await this.repo.findByReservationId(reservationId);
    if (!payment) {
      throw new NotFoundException(
        `No payment found for reservation ${reservationId}`,
      );
    }
    return {
      id: payment.id,
      reservationId: payment.reservation_id,
      status: payment.status,
      failureReason: payment.failure_reason ?? undefined,
      amountUsd: payment.amount_usd ? parseFloat(payment.amount_usd) : 0,
      currency: payment.currency,
      stripePaymentIntentId: payment.stripe_payment_intent_id,
      guestEmail: payment.guest_email,
      partnerId: payment.partner_id,
      propertyId: payment.property_id,
      propertyName: payment.property_name,
      grossAmountUsd: payment.gross_amount_usd
        ? parseFloat(payment.gross_amount_usd)
        : null,
      taxAmountUsd: payment.tax_amount_usd
        ? parseFloat(payment.tax_amount_usd)
        : null,
      partnerFeeUsd: payment.partner_fee_usd
        ? parseFloat(payment.partner_fee_usd)
        : null,
      commissionRate: payment.commission_rate
        ? parseFloat(payment.commission_rate)
        : null,
      commissionAmountUsd: payment.commission_amount_usd
        ? parseFloat(payment.commission_amount_usd)
        : null,
      netPayoutUsd: payment.net_payout_usd
        ? parseFloat(payment.net_payout_usd)
        : null,
      capturedAt:
        payment.captured_at instanceof Date
          ? payment.captured_at.toISOString()
          : (payment.captured_at ?? null),
      createdAt:
        payment.created_at instanceof Date
          ? payment.created_at.toISOString()
          : String(payment.created_at),
    };
  }

  private async onPaymentSucceeded(intent: StripePaymentIntent): Promise<void> {
    const reservationId = intent.metadata["reservation_id"];
    const guestEmail = intent.metadata["guest_email"];
    const paymentMethodId =
      typeof intent.payment_method === "string"
        ? intent.payment_method
        : (intent.payment_method?.id ?? null);

    await this.repo.updateByIntentId(intent.id, {
      status: "captured",
      stripe_payment_method_id: paymentMethodId,
      captured_at: new Date(),
    });

    await this.booking
      .confirmReservation(reservationId)
      .catch((err: unknown) => {
        const detail = err instanceof UpstreamServiceError ? err.cause : err;
        this.logger.error(
          `Failed to confirm booking ${reservationId}: ${String(detail)}`,
        );
      });

    await this.notifications
      .sendPaymentSucceeded({
        to: guestEmail,
        reservationId,
        amountUsd: intent.amount / 100,
      })
      .catch((err) =>
        this.logger.error(`Failed to send success email: ${err}`),
      );
  }

  private async onPaymentFailed(intent: StripePaymentIntent): Promise<void> {
    const reservationId = intent.metadata["reservation_id"];
    const guestEmail = intent.metadata["guest_email"];
    const reason = intent.last_payment_error?.message ?? "Payment declined";

    await this.repo.updateByIntentId(intent.id, {
      status: "failed",
      failure_reason: reason,
    });

    await this.booking
      .failReservation(reservationId, reason)
      .catch((err: unknown) => {
        const detail = err instanceof UpstreamServiceError ? err.cause : err;
        this.logger.error(
          `Failed to mark reservation ${reservationId} as failed: ${String(detail)}`,
        );
      });

    await this.notifications
      .sendPaymentFailed({ to: guestEmail, reservationId, reason })
      .catch((err) =>
        this.logger.error(`Failed to send failure email: ${err}`),
      );
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
