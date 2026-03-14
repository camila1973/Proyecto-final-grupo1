import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return { status: 'ok', service: 'booking-service' };
  }

  getReservations(): object {
    return {
      total: 2,
      reservations: [
        { id: 'res_001', propertyId: 'prop_001', roomId: 'room_001', guestId: 'usr_002', checkIn: '2026-04-10', checkOut: '2026-04-15', status: 'confirmed', totalAmount: 1750 },
        { id: 'res_002', propertyId: 'prop_002', roomId: 'room_003', guestId: 'usr_003', checkIn: '2026-05-01', checkOut: '2026-05-03', status: 'pending', totalAmount: 240 },
      ],
    };
  }

  getReservation(id: string): object {
    if (id === 'res_001') {
      return { id: 'res_001', propertyId: 'prop_001', roomId: 'room_001', guestId: 'usr_002', checkIn: '2026-04-10', checkOut: '2026-04-15', status: 'confirmed', totalAmount: 1750 };
    }
    return { error: 'Reservation not found', id };
  }

  createReservation(body: { propertyId: string; roomId: string; guestId: string; checkIn: string; checkOut: string }): object {
    return {
      id: 'res_' + Math.random().toString(36).slice(2, 9),
      ...body,
      status: 'pending',
      holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }
}
