import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return { status: 'ok', service: 'inventory-service' };
  }

  getRooms(propertyId?: string): object {
    const rooms = [
      { id: 'room_001', propertyId: 'prop_001', type: 'suite', beds: 2, pricePerNight: 350, currency: 'USD' },
      { id: 'room_002', propertyId: 'prop_001', type: 'standard', beds: 1, pricePerNight: 200, currency: 'USD' },
      { id: 'room_003', propertyId: 'prop_002', type: 'studio', beds: 1, pricePerNight: 120, currency: 'BRL' },
    ];
    const filtered = propertyId ? rooms.filter(r => r.propertyId === propertyId) : rooms;
    return { total: filtered.length, rooms: filtered };
  }

  getAvailability(propertyId: string, checkIn: string, checkOut: string): object {
    return {
      propertyId,
      checkIn,
      checkOut,
      available: true,
      rooms: [
        { roomId: 'room_001', available: true, pricePerNight: 350 },
        { roomId: 'room_002', available: false, pricePerNight: 200 },
      ],
    };
  }
}
