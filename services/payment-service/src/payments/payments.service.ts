import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import Stripe from "stripe";
import { PaymentsRepository } from "./payments.repository.js";
import { EmailService } from "./email.service.js";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto.js";

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
  private readonly bookingServiceUrl: string;

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly email: EmailService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
    this.stripe = new Stripe(secretKey);
    this.bookingServiceUrl =
      process.env.BOOKING_SERVICE_URL ?? "http://localhost:3004";
  }

  async initiate(dto: InitiatePaymentDto) {
    const amountCents = Math.round(dto.amountUsd * 100);

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: dto.currency.toLowerCase(),
      metadata: {
        reservation_id: dto.reservationId,
        guest_email: dto.guestEmail,
      },
      receipt_email: dto.guestEmail,
    });

    const payment = await this.repo.create({
      reservation_id: dto.reservationId,
      stripe_payment_intent_id: intent.id,
      stripe_payment_method_id: null,
      amount_usd: dto.amountUsd,
      currency: dto.currency.toLowerCase(),
      status: "pending",
      failure_reason: null,
      guest_email: dto.guestEmail,
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
      status: payment.status,
      failureReason: payment.failure_reason ?? undefined,
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
    });

    await this.confirmBooking(reservationId);

    await this.email
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

    await this.email
      .sendPaymentFailed({ to: guestEmail, reservationId, reason })
      .catch((err) =>
        this.logger.error(`Failed to send failure email: ${err}`),
      );
  }

  private async confirmBooking(reservationId: string): Promise<void> {
    try {
      const res = await fetch(
        `${this.bookingServiceUrl}/reservations/${reservationId}/confirm`,
        { method: "PATCH" },
      );
      if (!res.ok) {
        this.logger.error(
          `Failed to confirm booking ${reservationId}: ${res.status}`,
        );
      } else {
        this.logger.log(`Booking confirmed: ${reservationId}`);
      }
    } catch (err) {
      this.logger.error(`Error confirming booking ${reservationId}: ${err}`);
    }
  }
}
