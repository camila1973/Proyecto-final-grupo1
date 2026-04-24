import { renderHook, act } from '@testing-library/react';

const mockNavigate = jest.fn();
const mockAuth: { user: { id: string; email: string; role: string } | null; token: string | null } = {
  user: null,
  token: null,
};

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('./useAuth', () => ({
  useAuth: () => mockAuth,
}));

import {
  peekCheckoutIntent,
  consumeCheckoutIntent,
  consumeReservationPromise,
  startCheckoutAfterLogin,
  useBookingFlow,
  type CheckoutIntent,
} from './useBookingFlow';

const INTENT: CheckoutIntent = {
  property: { id: 'prop-1', name: 'Hotel Test' },
  room: { id: 'room-1', type: 'Suite', partnerId: 'partner-1', totalUsd: 250 },
  stay: { checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2 },
};

const RESERVATION_RESPONSE = {
  id: 'res-1',
  propertyId: 'prop-1',
  roomId: 'room-1',
  bookerId: 'user-1',
  guestInfo: { firstName: 'Ana', lastName: 'García', email: 'ana@example.com' },
  checkIn: '2026-06-01',
  checkOut: '2026-06-03',
  status: 'on_hold',
  fareBreakdown: {},
  taxTotalUsd: 0,
  feeTotalUsd: 0,
  grandTotalUsd: 250,
  holdExpiresAt: '2026-06-01T00:15:00Z',
  createdAt: '2026-06-01T00:00:00Z',
};

beforeEach(() => {
  sessionStorage.clear();
  consumeReservationPromise(); // drain any leftover module-level promise
  mockNavigate.mockReset();
  mockAuth.user = null;
  mockAuth.token = null;
  global.fetch = jest.fn();
});

describe('peekCheckoutIntent', () => {
  it('returns null when no intent is stored', () => {
    expect(peekCheckoutIntent()).toBeNull();
  });

  it('returns the stored intent without removing it', () => {
    sessionStorage.setItem('checkoutIntent', JSON.stringify(INTENT));

    const result = peekCheckoutIntent();

    expect(result).toEqual(INTENT);
    expect(sessionStorage.getItem('checkoutIntent')).not.toBeNull();
  });
});

describe('consumeCheckoutIntent', () => {
  it('returns null when no intent is stored', () => {
    expect(consumeCheckoutIntent()).toBeNull();
  });

  it('returns the intent and removes it from sessionStorage', () => {
    sessionStorage.setItem('checkoutIntent', JSON.stringify(INTENT));

    const result = consumeCheckoutIntent();

    expect(result).toEqual(INTENT);
    expect(sessionStorage.getItem('checkoutIntent')).toBeNull();
  });
});

describe('consumeReservationPromise', () => {
  it('returns null when no pending promise exists', () => {
    expect(consumeReservationPromise()).toBeNull();
  });

  it('returns the promise and resets the slot to null', () => {
    // startCheckoutAfterLogin sets the module-level pendingReservation
    sessionStorage.setItem('checkoutIntent', JSON.stringify(INTENT));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(RESERVATION_RESPONSE),
    });
    startCheckoutAfterLogin('token-123', 'user-1');

    const p = consumeReservationPromise();
    expect(p).toBeInstanceOf(Promise);
    // Second call returns null since the slot was reset
    expect(consumeReservationPromise()).toBeNull();
  });
});

describe('startCheckoutAfterLogin', () => {
  it('returns false when no checkout intent is pending', () => {
    const result = startCheckoutAfterLogin('token-123', 'user-1');
    expect(result).toBe(false);
  });

  it('returns true and sets a pending reservation when an intent exists', () => {
    sessionStorage.setItem('checkoutIntent', JSON.stringify(INTENT));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(RESERVATION_RESPONSE),
    });

    const result = startCheckoutAfterLogin('token-123', 'user-1');

    expect(result).toBe(true);
    expect(consumeReservationPromise()).toBeInstanceOf(Promise);
  });
});

describe('useBookingFlow', () => {
  describe('book()', () => {
    it('navigates to /login when user is not authenticated', () => {
      mockAuth.user = null;

      const { result } = renderHook(() => useBookingFlow());
      act(() => {
        result.current.book(INTENT);
      });

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });

    it('fires reservation and navigates to /booking/checkout when user is authenticated', () => {
      mockAuth.user = { id: 'user-1', email: 'user@example.com', role: 'guest' };
      mockAuth.token = 'token-123';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(RESERVATION_RESPONSE),
      });

      const { result } = renderHook(() => useBookingFlow());
      act(() => {
        result.current.book(INTENT);
      });

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/booking/checkout' });
      expect(consumeReservationPromise()).toBeInstanceOf(Promise);
    });
  });
});
