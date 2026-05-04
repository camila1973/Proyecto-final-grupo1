import { Injectable, Logger } from "@nestjs/common";

export interface SendNotificationParams {
  userId: string;
  to?: string;
  channel: "email" | "push";
  subject: string;
  message: string;
}

@Injectable()
export class NotificationClient {
  private readonly logger = new Logger(NotificationClient.name);
  private readonly baseUrl =
    process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:3006";

  async send(params: SendNotificationParams): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        this.logger.warn(
          `notification-service responded [${res.status}] for userId=${params.userId}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to send notification to userId=${params.userId}: ${err}`,
      );
    }
  }
}
