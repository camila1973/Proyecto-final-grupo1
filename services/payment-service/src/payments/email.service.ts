import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPaymentSucceeded(opts: {
    to: string;
    reservationId: string;
    amountUsd: string | number;
  }): Promise<void> {
    const subject = "Reserva confirmada — TravelHub";
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
    await this.send(opts.to, subject, html);
  }

  async sendPaymentFailed(opts: {
    to: string;
    reservationId: string;
    reason: string;
  }): Promise<void> {
    const subject = "Pago no procesado — TravelHub";
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
    await this.send(opts.to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const smtpHost = process.env.SMTP_HOST;

    if (!smtpHost) {
      this.logger.log(
        `[DEV MODE] Email to <${to}> | Subject: ${subject} | (SMTP not configured)`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@travelhub.com",
      to,
      subject,
      html,
    });

    this.logger.log(`Email sent to <${to}> | Subject: ${subject}`);
  }
}
