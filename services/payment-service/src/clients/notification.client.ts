import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class NotificationClient {
  private readonly logger = new Logger(NotificationClient.name);
  private readonly baseUrl =
    process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:3006";

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
