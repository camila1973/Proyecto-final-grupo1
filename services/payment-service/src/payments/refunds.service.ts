import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import Stripe from "stripe";
import { PaymentsRepository } from "./payments.repository.js";
import { RefundsRepository } from "./refunds.repository.js";
import { BookingClient, RefundQuote } from "../clients/booking.client.js";
import { NotificationClient } from "../clients/notification.client.js";

// Subset of the Stripe Refund object we actually use. Avoids namespace
// access issues under nodenext module resolution (see PaymentsService).
interface StripeRefund {
  id: string;
  status?: string | null;
  failure_reason?: string | null;
}

// Stripe refund states that count as a customer-visible "issued" outcome.
// `succeeded` settles immediately on most card networks; `pending` is the
// async path (ACH, certain currencies) — the money is in flight and the bank
// ETA already covers it, so we audit and email the guest the same way.
// Anything else (`failed`, `canceled`, `requires_action`) is treated as a
// gateway rejection: failed audit row + customer-support alert.
const ISSUED_STRIPE_STATUSES = new Set(["succeeded", "pending"]);

export interface IssueRefundInput {
  reservationId: string;
  reason: string;
  actorId: string | null;
  actorRole: string | null;
  requestIp: string | null;
}

export interface IssueRefundResult {
  status: "succeeded" | "skipped";
  policy: RefundQuote["policy"];
  refundedUsd: number;
  externalRef: string | null;
  adjustmentId: string;
}

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly payments: PaymentsRepository,
    private readonly refunds: RefundsRepository,
    private readonly booking: BookingClient,
    private readonly notifications: NotificationClient,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
    this.stripe = new Stripe(secretKey);
  }

  /**
   * Issues an automated refund for a cancelled reservation.
   *
   * Flow:
   *   1. Find the captured payment for the reservation.
   *   2. Re-fetch the cancellation policy from booking-service so the policy
   *      decision is server-authoritative (the caller's quote is advisory).
   *   3. If policy says no_refund → record a zero-amount audit row and return.
   *   4. Otherwise call Stripe `refunds.create` against the original PI; on
   *      failure, record the failed adjustment and alert customer support.
   *   5. Send the guest the refund receipt with bank ETA.
   */
  async issueRefund(input: IssueRefundInput): Promise<IssueRefundResult> {
    const payment = await this.payments.findByReservationId(
      input.reservationId,
    );
    if (!payment) {
      throw new NotFoundException(
        `No payment found for reservation ${input.reservationId}`,
      );
    }
    if (payment.status !== "captured") {
      throw new BadRequestException(
        `Refund requires a captured payment (current status: ${payment.status})`,
      );
    }

    const quote = await this.booking.getRefundQuote(input.reservationId);

    if (quote.policy === "no_refund" || quote.refundableUsd <= 0) {
      const adjustment = await this.refunds.insert({
        payment_id: payment.id,
        kind: "refund",
        amount_usd: 0,
        external_ref: null,
        reason: input.reason,
        status: "succeeded",
        failure_reason: null,
        actor_id: input.actorId,
        actor_role: input.actorRole,
        request_ip: input.requestIp,
      });
      this.logger.log(
        `Refund skipped (policy=no_refund) for reservation ${input.reservationId}`,
      );
      return {
        status: "skipped",
        policy: "no_refund",
        refundedUsd: 0,
        externalRef: null,
        adjustmentId: adjustment.id,
      };
    }

    const amountCents = Math.round(quote.refundableUsd * 100);

    let stripeRefund: StripeRefund;
    try {
      stripeRefund = (await this.stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: {
          reservation_id: input.reservationId,
          actor_id: input.actorId ?? "",
          actor_role: input.actorRole ?? "",
        },
      })) as StripeRefund;
    } catch (err) {
      const failureReason = err instanceof Error ? err.message : String(err);
      const adjustment = await this.refunds.insert({
        payment_id: payment.id,
        kind: "refund",
        amount_usd: quote.refundableUsd,
        external_ref: null,
        reason: input.reason,
        status: "failed",
        failure_reason: failureReason,
        actor_id: input.actorId,
        actor_role: input.actorRole,
        request_ip: input.requestIp,
      });
      this.logger.error(
        `Stripe refund failed for reservation ${input.reservationId}: ${failureReason}`,
      );
      await this.notifications
        .sendRefundFailedAlert({
          reservationId: input.reservationId,
          paymentIntentId: payment.stripe_payment_intent_id,
          attemptedUsd: quote.refundableUsd,
          failureReason,
          actorId: input.actorId,
          actorRole: input.actorRole,
        })
        .catch((alertErr) =>
          this.logger.error(
            `Failed to alert customer-support inbox: ${alertErr}`,
          ),
        );
      throw new BadGatewayException(
        `Refund could not be processed (adjustment ${adjustment.id}). Customer support has been notified.`,
      );
    }

    // Stripe accepted the refund call but the resulting state is what tells
    // us whether to treat this as customer-visible success. `failed`,
    // `canceled` and `requires_action` all mean the money will not move on
    // its own, so we audit them as failed and alert customer support.
    const stripeStatus = stripeRefund.status ?? "succeeded";
    if (!ISSUED_STRIPE_STATUSES.has(stripeStatus)) {
      const failureReason =
        stripeRefund.failure_reason ?? `stripe_status=${stripeStatus}`;
      const adjustment = await this.refunds.insert({
        payment_id: payment.id,
        kind: "refund",
        amount_usd: quote.refundableUsd,
        external_ref: stripeRefund.id,
        reason: input.reason,
        status: "failed",
        failure_reason: failureReason,
        actor_id: input.actorId,
        actor_role: input.actorRole,
        request_ip: input.requestIp,
      });
      this.logger.error(
        `Stripe refund ${stripeRefund.id} returned non-issued status "${stripeStatus}" for reservation ${input.reservationId}`,
      );
      await this.notifications
        .sendRefundFailedAlert({
          reservationId: input.reservationId,
          paymentIntentId: payment.stripe_payment_intent_id,
          attemptedUsd: quote.refundableUsd,
          failureReason,
          actorId: input.actorId,
          actorRole: input.actorRole,
        })
        .catch((alertErr) =>
          this.logger.error(
            `Failed to alert customer-support inbox: ${alertErr}`,
          ),
        );
      throw new BadGatewayException(
        `Refund could not be processed (adjustment ${adjustment.id}). Customer support has been notified.`,
      );
    }

    const adjustment = await this.refunds.insert({
      payment_id: payment.id,
      kind: "refund",
      amount_usd: quote.refundableUsd,
      external_ref: stripeRefund.id,
      reason: input.reason,
      status: "succeeded",
      failure_reason: null,
      actor_id: input.actorId,
      actor_role: input.actorRole,
      request_ip: input.requestIp,
    });

    await this.notifications
      .sendRefundIssued({
        to: payment.guest_email,
        reservationId: input.reservationId,
        refundedUsd: quote.refundableUsd,
        policy: quote.policy,
        refundExternalRef: stripeRefund.id,
      })
      .catch((err) =>
        this.logger.error(`Failed to send refund receipt email: ${err}`),
      );

    this.logger.log(
      `Refund ${stripeRefund.id} issued (stripe_status=${stripeStatus}) for reservation ${input.reservationId} (USD ${quote.refundableUsd.toFixed(2)})`,
    );

    return {
      status: "succeeded",
      policy: quote.policy,
      refundedUsd: quote.refundableUsd,
      externalRef: stripeRefund.id,
      adjustmentId: adjustment.id,
    };
  }
}
