/**
 * Tests for checkout-store service
 * Validates checkout intent storage and retrieval
 */

import {
  getCheckoutIntent,
  setCheckoutIntent,
  clearCheckoutIntent,
  rebuildIntent,
  type CheckoutIntent,
} from './checkout-store';

describe('checkout-store', () => {
  beforeEach(() => {
    // Clear any existing intent before each test
    clearCheckoutIntent();
  });

  describe('setCheckoutIntent and getCheckoutIntent', () => {
    it('should store and retrieve checkout intent', () => {
      const intent: CheckoutIntent = {
        propertyId: 'prop-123',
        propertyName: 'Hotel Test',
        propertyCity: 'Test City',
        propertyThumbnailUrl: 'https://example.com/img.jpg',
        roomId: 'room-456',
        roomType: 'Deluxe King',
        partnerId: 'partner-789',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        guests: 2,
        estimatedTotalUsd: 300,
      };

      setCheckoutIntent(intent);
      const retrieved = getCheckoutIntent();

      expect(retrieved).toEqual(intent);
    });

    it('should return null when no intent is stored', () => {
      const result = getCheckoutIntent();
      expect(result).toBeNull();
    });

    it('should overwrite previous intent when setting new one', () => {
      const intent1: CheckoutIntent = {
        propertyId: 'prop-1',
        propertyName: 'Hotel 1',
        propertyCity: 'City 1',
        propertyThumbnailUrl: null,
        roomId: 'room-1',
        roomType: 'Standard',
        partnerId: 'partner-1',
        checkIn: '2026-05-01',
        checkOut: '2026-05-02',
        guests: 1,
        estimatedTotalUsd: 100,
      };

      const intent2: CheckoutIntent = {
        propertyId: 'prop-2',
        propertyName: 'Hotel 2',
        propertyCity: 'City 2',
        propertyThumbnailUrl: 'https://example.com/img2.jpg',
        roomId: 'room-2',
        roomType: 'Deluxe',
        partnerId: 'partner-2',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        guests: 2,
        estimatedTotalUsd: 400,
      };

      setCheckoutIntent(intent1);
      setCheckoutIntent(intent2);
      
      const retrieved = getCheckoutIntent();
      expect(retrieved).toEqual(intent2);
      expect(retrieved).not.toEqual(intent1);
    });
  });

  describe('clearCheckoutIntent', () => {
    it('should clear stored intent', () => {
      const intent: CheckoutIntent = {
        propertyId: 'prop-123',
        propertyName: 'Hotel Test',
        propertyCity: 'Test City',
        propertyThumbnailUrl: 'https://example.com/img.jpg',
        roomId: 'room-456',
        roomType: 'Deluxe King',
        partnerId: 'partner-789',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        guests: 2,
        estimatedTotalUsd: 300,
      };

      setCheckoutIntent(intent);
      expect(getCheckoutIntent()).toEqual(intent);

      clearCheckoutIntent();
      expect(getCheckoutIntent()).toBeNull();
    });

    it('should be safe to call multiple times', () => {
      clearCheckoutIntent();
      clearCheckoutIntent();
      expect(getCheckoutIntent()).toBeNull();
    });
  });

  describe('CheckoutIntent type validation', () => {
    it('should handle null propertyThumbnailUrl', () => {
      const intent: CheckoutIntent = {
        propertyId: 'prop-123',
        propertyName: 'Hotel Test',
        propertyCity: 'Test City',
        propertyThumbnailUrl: null,
        roomId: 'room-456',
        roomType: 'Standard',
        partnerId: 'partner-789',
        checkIn: '2026-05-01',
        checkOut: '2026-05-02',
        guests: 1,
        estimatedTotalUsd: 100,
      };

      setCheckoutIntent(intent);
      const retrieved = getCheckoutIntent();
      
      expect(retrieved?.propertyThumbnailUrl).toBeNull();
    });

    it('should preserve all fields correctly', () => {
      const intent: CheckoutIntent = {
        propertyId: 'b1000000-0000-0000-0000-000000000001',
        propertyName: 'Gran Caribe Resort & Spa',
        propertyCity: 'Cancún',
        propertyThumbnailUrl: 'https://example.com/gran-caribe.jpg',
        roomId: 'c1000000-0000-0000-0000-000000000001',
        roomType: 'Habitación Deluxe',
        partnerId: 'a1000000-0000-0000-0000-000000000001',
        checkIn: '2026-04-26',
        checkOut: '2026-04-28',
        guests: 2,
        estimatedTotalUsd: 501,
      };

      setCheckoutIntent(intent);
      const retrieved = getCheckoutIntent();

      expect(retrieved?.propertyId).toBe(intent.propertyId);
      expect(retrieved?.propertyName).toBe(intent.propertyName);
      expect(retrieved?.propertyCity).toBe(intent.propertyCity);
      expect(retrieved?.propertyThumbnailUrl).toBe(intent.propertyThumbnailUrl);
      expect(retrieved?.roomId).toBe(intent.roomId);
      expect(retrieved?.roomType).toBe(intent.roomType);
      expect(retrieved?.partnerId).toBe(intent.partnerId);
      expect(retrieved?.checkIn).toBe(intent.checkIn);
      expect(retrieved?.checkOut).toBe(intent.checkOut);
      expect(retrieved?.guests).toBe(intent.guests);
      expect(retrieved?.estimatedTotalUsd).toBe(intent.estimatedTotalUsd);
    });
  });

  describe('rebuildIntent', () => {
    it('should rebuild CheckoutIntent from reservation with snapshot', () => {
      const reservation = {
        propertyId: 'prop-123',
        roomId: 'room-456',
        partnerId: 'partner-789',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        grandTotalUsd: 500,
        snapshot: {
          propertyName: 'Hotel Paradise',
          propertyCity: 'Miami',
          propertyThumbnailUrl: 'https://example.com/hotel.jpg',
          roomType: 'Suite',
        },
      };

      const result = rebuildIntent(reservation);

      expect(result).not.toBeNull();
      expect(result?.propertyId).toBe('prop-123');
      expect(result?.propertyName).toBe('Hotel Paradise');
      expect(result?.propertyCity).toBe('Miami');
      expect(result?.propertyThumbnailUrl).toBe('https://example.com/hotel.jpg');
      expect(result?.roomId).toBe('room-456');
      expect(result?.roomType).toBe('Suite');
      expect(result?.partnerId).toBe('partner-789');
      expect(result?.checkIn).toBe('2026-05-01');
      expect(result?.checkOut).toBe('2026-05-03');
      expect(result?.guests).toBe(2); // Default value
      expect(result?.estimatedTotalUsd).toBe(500);
    });

    it('should return null when snapshot is missing', () => {
      const reservation = {
        propertyId: 'prop-123',
        roomId: 'room-456',
        partnerId: 'partner-789',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        grandTotalUsd: 500,
        snapshot: null,
      };

      const result = rebuildIntent(reservation);

      expect(result).toBeNull();
    });

    it('should handle null grandTotalUsd', () => {
      const reservation = {
        propertyId: 'prop-123',
        roomId: 'room-456',
        partnerId: 'partner-789',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        grandTotalUsd: null,
        snapshot: {
          propertyName: 'Hotel Paradise',
          propertyCity: 'Miami',
          propertyThumbnailUrl: null,
          roomType: 'Suite',
        },
      };

      const result = rebuildIntent(reservation);

      expect(result).not.toBeNull();
      expect(result?.estimatedTotalUsd).toBe(0);
    });

    it('should handle null propertyThumbnailUrl in snapshot', () => {
      const reservation = {
        propertyId: 'prop-123',
        roomId: 'room-456',
        partnerId: 'partner-789',
        checkIn: '2026-05-01',
        checkOut: '2026-05-03',
        grandTotalUsd: 300,
        snapshot: {
          propertyName: 'Budget Hotel',
          propertyCity: 'Orlando',
          propertyThumbnailUrl: null,
          roomType: 'Standard',
        },
      };

      const result = rebuildIntent(reservation);

      expect(result).not.toBeNull();
      expect(result?.propertyThumbnailUrl).toBeNull();
    });
  });
});
