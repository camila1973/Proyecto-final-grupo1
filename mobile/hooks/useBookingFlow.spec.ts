import type { Reservation } from '@/services/bookings-cache';
import type { CheckoutIntent } from '@/services/checkout-store';

import { useBookingFlow, BookingFlowError } from './useBookingFlow';

// react-native pulls in Flow-typed imports + native bridges that don't load in the
// node test env. Mock the only API we touch.
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (fn: unknown) => fn,
}));

const pushMock = jest.fn();
const replaceMock = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const useAuthMock = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/services/checkout-store', () => ({
  setCheckoutIntent: jest.fn(),
  getCheckoutIntent: jest.fn(),
  clearCheckoutIntent: jest.fn(),
  rebuildIntent: jest.fn(),
}));

jest.mock('@/services/pending-reservations-store', () => ({
  setPendingReservation: jest.fn(),
}));

jest.mock('@/services/bookings-cache', () => ({
  hasHeldReservation: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));

jest.mock('@/context/AuthContext', () => ({
  TOKEN_KEY: '@auth_token',
  USER_KEY: '@auth_user',
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Alert } = require('react-native');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const checkoutStore = require('@/services/checkout-store');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pendingStore = require('@/services/pending-reservations-store');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bookingsCache = require('@/services/bookings-cache');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const INTENT: CheckoutIntent = {
  propertyId: 'prop-1',
  propertyName: 'Hotel A',
  propertyCity: 'Cancún',
  propertyThumbnailUrl: null,
  roomId: 'room-1',
  roomType: 'Suite',
  partnerId: 'partner-1',
  checkIn: '2026-05-15',
  checkOut: '2026-05-17',
  guests: 2,
  estimatedTotalUsd: 800,
};

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    propertyId: 'prop-1',
    roomId: 'room-1',
    partnerId: 'partner-1',
    bookerId: 'user-1',
    checkIn: '2026-05-15',
    checkOut: '2026-05-17',
    status: 'held',
    reason: null,
    grandTotalUsd: 800,
    snapshot: {
      propertyName: 'Hotel A',
      propertyCity: 'Cancún',
      propertyNeighborhood: null,
      propertyCountryCode: 'MX',
      propertyThumbnailUrl: null,
      roomType: 'Suite',
    },
    holdExpiresAt: null,
    checkedInAt: null,
    createdAt: '2026-05-10T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthMock.mockReturnValue({
    token: 'tok-1',
    user: { id: 'user-1', email: 'g@example.com', role: 'guest' },
  });
});

// ─── book ─────────────────────────────────────────────────────────────────────

describe('book', () => {
  it('alerts when check-in is missing and does not navigate', () => {
     
    const { book } = useBookingFlow();

    book({ ...INTENT, checkIn: '' });

    expect(Alert.alert).toHaveBeenCalledWith('property.selectDatesTitle', 'property.selectDatesMsg');
    expect(checkoutStore.setCheckoutIntent).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('alerts when check-out is missing', () => {
     
    const { book } = useBookingFlow();

    book({ ...INTENT, checkOut: '' });

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('stashes intent and routes to /sign-in-required when logged out', () => {
    useAuthMock.mockReturnValue({ token: null, user: null });
     
    const { book } = useBookingFlow();

    book(INTENT);

    expect(checkoutStore.setCheckoutIntent).toHaveBeenCalledWith(INTENT);
    expect(pushMock).toHaveBeenCalledWith('/sign-in-required');
  });

  it('stashes intent and routes to /booking/checkout when authenticated', () => {
     
    const { book } = useBookingFlow();

    book(INTENT);

    expect(checkoutStore.setCheckoutIntent).toHaveBeenCalledWith(INTENT);
    expect(pushMock).toHaveBeenCalledWith('/booking/checkout');
  });
});

// ─── resumeAfterAuth ──────────────────────────────────────────────────────────

describe('resumeAfterAuth', () => {
  it('replaces to /booking/checkout when an intent is stashed', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(INTENT);

    const { resumeAfterAuth } = useBookingFlow();

    await resumeAfterAuth();

    expect(replaceMock).toHaveBeenCalledWith('/booking/checkout');
    expect(bookingsCache.hasHeldReservation).not.toHaveBeenCalled();
  });

  it('replaces to /(tabs) when no intent and no held reservations', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(null);
    AsyncStorage.getItem.mockImplementation((key: string) =>
      Promise.resolve(
        key === '@auth_token'
          ? 'tok-1'
          : JSON.stringify({ id: 'user-1', email: 'g@example.com', role: 'guest' }),
      ),
    );
    bookingsCache.hasHeldReservation.mockResolvedValue(false);

    const { resumeAfterAuth } = useBookingFlow();

    await resumeAfterAuth();

    expect(bookingsCache.hasHeldReservation).toHaveBeenCalledWith('tok-1', 'user-1');
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });

  it('replaces to /(tabs)/trips when no intent but user has a held reservation', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(null);
    AsyncStorage.getItem.mockImplementation((key: string) =>
      Promise.resolve(
        key === '@auth_token'
          ? 'tok-1'
          : JSON.stringify({ id: 'user-1', email: 'g@example.com', role: 'guest' }),
      ),
    );
    bookingsCache.hasHeldReservation.mockResolvedValue(true);

    const { resumeAfterAuth } = useBookingFlow();

    await resumeAfterAuth();

    expect(replaceMock).toHaveBeenCalledWith('/(tabs)/trips');
  });

  it('falls back to /(tabs) when stored credentials are missing', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(null);
    AsyncStorage.getItem.mockResolvedValue(null);

    const { resumeAfterAuth } = useBookingFlow();

    await resumeAfterAuth();

    expect(bookingsCache.hasHeldReservation).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
  });
});

// ─── resumeHeld ───────────────────────────────────────────────────────────────

describe('resumeHeld', () => {
  it('rebuilds intent and pushes to checkout, returning true', () => {
    checkoutStore.rebuildIntent.mockReturnValue(INTENT);
     
    const { resumeHeld } = useBookingFlow();

    const result = resumeHeld(makeReservation());

    expect(result).toBe(true);
    expect(checkoutStore.setCheckoutIntent).toHaveBeenCalledWith(INTENT);
    expect(pushMock).toHaveBeenCalledWith('/booking/checkout');
  });

  it('returns false when intent cannot be rebuilt', () => {
    checkoutStore.rebuildIntent.mockReturnValue(null);
     
    const { resumeHeld } = useBookingFlow();

    const result = resumeHeld(makeReservation({ snapshot: null }));

    expect(result).toBe(false);
    expect(checkoutStore.setCheckoutIntent).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

// ─── createReservation ────────────────────────────────────────────────────────

describe('createReservation', () => {
  const CREATED = {
    id: 'res-1',
    grandTotalUsd: 800,
    holdExpiresAt: '2026-05-10T01:00:00Z',
    fareBreakdown: {
      nights: 2,
      roomRateUsd: 400,
      subtotalUsd: 800,
      taxes: [],
      fees: [],
      taxTotalUsd: 0,
      feeTotalUsd: 0,
      totalUsd: 800,
    },
  };

  it('throws BookingFlowError when no intent is stashed', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(null);
     
    const { createReservation } = useBookingFlow();

    await expect(createReservation()).rejects.toBeInstanceOf(BookingFlowError);
  });

  it('throws BookingFlowError when not authenticated', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(INTENT);
    useAuthMock.mockReturnValue({ token: null, user: null });
     
    const { createReservation } = useBookingFlow();

    await expect(createReservation()).rejects.toBeInstanceOf(BookingFlowError);
  });

  it('POSTs to /reservations with intent + booker id and returns the created reservation', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(INTENT);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(CREATED),
    } as Response);

     
    const { createReservation } = useBookingFlow();
    const result = await createReservation();

    expect(result).toEqual(CREATED);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(init.body)).toEqual({
      propertyId: 'prop-1',
      roomId: 'room-1',
      partnerId: 'partner-1',
      bookerId: 'user-1',
      checkIn: '2026-05-15',
      checkOut: '2026-05-17',
    });
    expect(pendingStore.setPendingReservation).toHaveBeenCalledWith(true);
  });

  it('extracts backend message from JSON error body', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(INTENT);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ message: 'Room is no longer available' })),
    } as Response);

     
    const { createReservation } = useBookingFlow();

    await expect(createReservation()).rejects.toThrow('Room is no longer available');
  });

  it('falls back to JSON.error field when message is absent', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(INTENT);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: 'invalid_state' })),
    } as Response);

     
    const { createReservation } = useBookingFlow();

    await expect(createReservation()).rejects.toThrow('invalid_state');
  });

  it('uses raw text body when error response is non-JSON', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(INTENT);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Service unavailable'),
    } as Response);

     
    const { createReservation } = useBookingFlow();

    await expect(createReservation()).rejects.toThrow('Service unavailable');
  });

  it('falls back to translated message when error body is too long', async () => {
    checkoutStore.getCheckoutIntent.mockReturnValue(INTENT);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('x'.repeat(500)),
    } as Response);

     
    const { createReservation } = useBookingFlow();

    await expect(createReservation()).rejects.toThrow('checkout.errorHold');
  });
});

// ─── BookingFlowError ─────────────────────────────────────────────────────────

describe('BookingFlowError', () => {
  it('preserves message and optional cause', () => {
    const cause = new Error('underlying');
    const err = new BookingFlowError('outer', cause);
    expect(err.message).toBe('outer');
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('BookingFlowError');
  });
});
