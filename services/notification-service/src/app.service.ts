import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return { status: 'ok', service: 'notification-service' };
  }

  getNotifications(): object {
    return {
      total: 2,
      notifications: [
        { id: 'notif_001', userId: 'usr_002', channel: 'email', subject: 'Booking Confirmed', sentAt: '2026-03-10T14:25:00Z', status: 'delivered' },
        { id: 'notif_002', userId: 'usr_003', channel: 'push', subject: 'Payment Pending', sentAt: '2026-03-11T09:10:00Z', status: 'delivered' },
      ],
    };
  }

  sendNotification(body: { userId: string; channel: string; subject: string; message: string }): object {
    return {
      id: 'notif_' + Math.random().toString(36).slice(2, 9),
      ...body,
      status: 'queued',
      queuedAt: new Date().toISOString(),
    };
  }
}
