import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return { status: 'ok', service: 'partners-service' };
  }

  getHotels(): object {
    return {
      total: 2,
      hotels: [
        { id: 'hotel_001', name: 'Cancún Paradise Resort', partnerId: 'partner_001', city: 'Cancún', totalRooms: 120, activeListings: 85 },
        { id: 'hotel_002', name: 'SP Business Suites', partnerId: 'partner_002', city: 'São Paulo', totalRooms: 60, activeListings: 58 },
      ],
    };
  }

  getRevenue(hotelId: string): object {
    return {
      hotelId,
      period: '2026-03',
      revenue: { total: 48500, currency: 'USD', bookings: 23, avgNightlyRate: 285 },
    };
  }

  getAllRevenue(): object {
    return {
      period: '2026-03',
      partners: [
        { partnerId: 'partner_001', hotelId: 'hotel_001', revenue: 48500, currency: 'USD' },
        { partnerId: 'partner_002', hotelId: 'hotel_002', revenue: 21200, currency: 'USD' },
      ],
      totalRevenue: 69700,
    };
  }
}
