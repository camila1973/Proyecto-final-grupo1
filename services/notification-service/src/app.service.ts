import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class AppService {
  getHealth(): object {
    return { status: "ok", service: "notification-service" };
  }

  getNotifications(): object {
    return {
      total: 2,
      notifications: [
        {
          id: "notif_001",
          userId: "usr_002",
          channel: "email",
          subject: "Booking Confirmed",
          sentAt: "2026-03-10T14:25:00Z",
          status: "delivered",
        },
        {
          id: "notif_002",
          userId: "usr_003",
          channel: "push",
          subject: "Payment Pending",
          sentAt: "2026-03-11T09:10:00Z",
          status: "delivered",
        },
      ],
    };
  }

  sendNotification(body: {
    userId: string;
    to?: string;
    channel: string;
    subject: string;
    message: string;
    html?: string;
  }): object {
    if (body.channel === "email" && body.to) {
      this.sendEmail(body.to, body.subject, body.message, body.html).catch(
        (err) => {
          console.error("[notification-service] Email send error:", err);
        },
      );
    }

    return {
      id: "notif_" + Math.random().toString(36).slice(2, 9),
      ...body,
      status: "queued",
      queuedAt: new Date().toISOString(),
    };
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    const smtpHost = process.env.SMTP_HOST;

    if (!smtpHost) {
      console.log(
        `[notification-service] DEV MODE - Email to <${to}> | Subject: ${subject} | ${text}`,
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
      text,
      ...(html ? { html } : {}),
    });
  }
}
