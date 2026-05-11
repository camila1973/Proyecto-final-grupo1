import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  onModuleInit(): void {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        "Firebase credentials not configured — push notifications disabled",
      );
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.logger.log("Firebase Admin SDK initialized");
    } catch (err) {
      this.logger.error(`Failed to initialize Firebase: ${String(err)}`);
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.app) {
      this.logger.debug(
        "Firebase not initialized — skipping push notification",
      );
      return;
    }
    try {
      await admin.messaging(this.app).send({
        token,
        notification: { title, body },
        ...(data ? { data } : {}),
      });
      this.logger.debug(`Push sent to token ${token.slice(0, 12)}...`);
    } catch (err) {
      this.logger.error(`FCM send failed: ${String(err)}`);
    }
  }
}
