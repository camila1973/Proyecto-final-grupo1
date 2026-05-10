import { Injectable, Logger } from "@nestjs/common";

// ETA shown to the guest after a successful refund. Stripe credits the original
// payment method in 5-10 business days; we round up to a single span so the
// email reads cleanly. Update if Stripe or PSP commitments change.
const REFUND_ETA_LABEL = "5 a 10 días hábiles";

@Injectable()
export class NotificationClient {
  private readonly logger = new Logger(NotificationClient.name);
  private readonly baseUrl =
    process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:3006";
  private readonly customerSupportInbox =
    process.env.CUSTOMER_SUPPORT_EMAIL ?? "soporte@travelhub.com";

  async sendPaymentSucceeded(opts: {
    to: string;
    reservationId: string;
    amountUsd: string | number;
  }): Promise<void> {
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#1a56db">¡Tu reserva está confirmada!</h2>
        <p>Tu pago fue procesado exitosamente y tu reserva ha quedado confirmada.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Número de reserva</td>
            <td style="padding:8px 0;font-weight:600;font-size:14px">${opts.reservationId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Total cobrado</td>
            <td style="padding:8px 0;font-weight:600;font-size:14px">USD $${Number(opts.amountUsd).toFixed(2)}</td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:13px">
          Si tienes preguntas sobre tu reserva, responde este correo y con gusto te ayudamos.
        </p>
        <p style="color:#6b7280;font-size:13px">— El equipo de TravelHub</p>
      </div>
    `;
    await this.send({
      userId: opts.reservationId,
      to: opts.to,
      channel: "email",
      subject: "Reserva confirmada — TravelHub",
      message: `Tu reserva ${opts.reservationId} ha sido confirmada. Total: USD $${Number(opts.amountUsd).toFixed(2)}`,
      html,
    });
  }

  async sendPaymentFailed(opts: {
    to: string;
    reservationId: string;
    reason: string;
  }): Promise<void> {
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#dc2626">No pudimos procesar tu pago</h2>
        <p>Lamentablemente tu pago no pudo ser procesado y la reserva fue cancelada.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Número de intento</td>
            <td style="padding:8px 0;font-weight:600;font-size:14px">${opts.reservationId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Motivo</td>
            <td style="padding:8px 0;font-size:14px">${opts.reason}</td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:13px">
          Por favor intenta de nuevo con otra tarjeta o contacta a tu banco.
        </p>
        <p style="color:#6b7280;font-size:13px">— El equipo de TravelHub</p>
      </div>
    `;
    await this.send({
      userId: opts.reservationId,
      to: opts.to,
      channel: "email",
      subject: "Pago no procesado — TravelHub",
      message: `No pudimos procesar el pago para la reserva ${opts.reservationId}. Motivo: ${opts.reason}`,
      html,
    });
  }

  async sendRefundIssued(opts: {
    to: string;
    reservationId: string;
    refundedUsd: number;
    policy: "full_refund" | "partial_refund";
    refundExternalRef: string;
  }): Promise<void> {
    const policyLabel =
      opts.policy === "full_refund"
        ? "Reembolso total"
        : "Reembolso parcial según política de cancelación";
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#1a56db">Tu reembolso fue procesado</h2>
        <p>${policyLabel}. Acreditaremos el importe en el mismo medio de pago utilizado para la compra.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Número de reserva</td>
            <td style="padding:8px 0;font-weight:600;font-size:14px">${opts.reservationId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Importe reembolsado</td>
            <td style="padding:8px 0;font-weight:600;font-size:14px">USD $${opts.refundedUsd.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Comprobante</td>
            <td style="padding:8px 0;font-family:monospace;font-size:13px">${opts.refundExternalRef}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px">Tiempo estimado de acreditación</td>
            <td style="padding:8px 0;font-weight:600;font-size:14px">${REFUND_ETA_LABEL}</td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:13px">
          Si el monto no aparece en tu cuenta luego del plazo indicado, responde este correo y te ayudaremos.
        </p>
        <p style="color:#6b7280;font-size:13px">— El equipo de TravelHub</p>
      </div>
    `;
    await this.send({
      userId: opts.reservationId,
      to: opts.to,
      channel: "email",
      subject: "Reembolso procesado — TravelHub",
      message: `Reembolso de USD $${opts.refundedUsd.toFixed(2)} para la reserva ${opts.reservationId}. Acreditación estimada: ${REFUND_ETA_LABEL}. Comprobante: ${opts.refundExternalRef}.`,
      html,
    });
  }

  async sendRefundFailedAlert(opts: {
    reservationId: string;
    paymentIntentId: string;
    attemptedUsd: number;
    failureReason: string;
    actorId: string | null;
    actorRole: string | null;
  }): Promise<void> {
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px">
        <h2 style="color:#dc2626">Acción requerida — reembolso falló</h2>
        <p>La pasarela de pago rechazó un reembolso automático. Resolución manual requerida.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
          <tr>
            <td style="padding:6px 0;color:#6b7280">Reserva</td>
            <td style="padding:6px 0;font-weight:600">${opts.reservationId}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">PaymentIntent</td>
            <td style="padding:6px 0;font-family:monospace">${opts.paymentIntentId}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Importe intentado</td>
            <td style="padding:6px 0;font-weight:600">USD $${opts.attemptedUsd.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Solicitado por</td>
            <td style="padding:6px 0">${opts.actorRole ?? "system"} ${opts.actorId ? `(${opts.actorId})` : ""}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;vertical-align:top">Motivo del fallo</td>
            <td style="padding:6px 0">${opts.failureReason}</td>
          </tr>
        </table>
      </div>
    `;
    await this.send({
      userId: "customer-support",
      to: this.customerSupportInbox,
      channel: "email",
      subject: `[ALERTA] Reembolso falló — reserva ${opts.reservationId}`,
      message: `Stripe rechazó el reembolso de USD $${opts.attemptedUsd.toFixed(2)} para la reserva ${opts.reservationId} (PI ${opts.paymentIntentId}). Motivo: ${opts.failureReason}.`,
      html,
    });
  }

  private async send(payload: object): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/notifications/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.error(
          `notification-service responded ${res.status} for payload ${JSON.stringify(payload)}`,
        );
      }
    } catch (err) {
      this.logger.error(`Failed to reach notification-service: ${err}`);
    }
  }
}
