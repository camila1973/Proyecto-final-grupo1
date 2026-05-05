import {
  fetchReservations,
  cacheReservations,
  getCachedReservations,
  syncReservations,
  checkIn,
  CheckInError,
  ACTIVE_STATUSES,
  type Reservation,
} from './bookings-cache';

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function mockFetchOk(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchError(status: number) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ message: 'error' }),
  } as Response);
}

// ─── fixtures ─────────────────────────────────────────────────────────────────

const SNAPSHOT = {
  propertyName: 'Hotel Central Park',
  propertyCity: 'Bogotá',
  propertyNeighborhood: 'Chapinero',
  propertyCountryCode: 'CO',
  propertyThumbnailUrl: 'https://example.com/img.jpg',
  roomType: 'Habitación doble superior',
};

const RESERVATION: Reservation = {
  id: 'res-001',
  propertyId: 'prop-001',
  roomId: 'room-001',
  partnerId: 'partner-001',
  bookerId: 'user-001',
  checkIn: '2026-03-03',
  checkOut: '2026-03-09',
  status: 'confirmed',
  reason: null,
  grandTotalUsd: 180,
  snapshot: SNAPSHOT,
  holdExpiresAt: null,
  checkedInAt: null,
  createdAt: '2026-03-01T10:00:00.000Z',
};

const API_RESPONSE = { total: 1, reservations: [RESERVATION] };

afterEach(() => jest.resetAllMocks());

// ─── fetchReservations ────────────────────────────────────────────────────────

describe('fetchReservations', () => {
  it('calls GET /api/booking/reservations with bookerId as query param', async () => {
    mockFetchOk(API_RESPONSE);
    await fetchReservations('token-abc', 'user-001');
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('/api/booking/reservations');
    expect(url).toContain('bookerId=user-001');
  });

  it('sends Authorization header with Bearer token', async () => {
    mockFetchOk(API_RESPONSE);
    await fetchReservations('token-abc', 'user-001');
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer token-abc');
  });

  it('returns the reservations array from the response', async () => {
    mockFetchOk(API_RESPONSE);
    const result = await fetchReservations('token-abc', 'user-001');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('res-001');
  });

  it('encodes userId with special characters in the query string', async () => {
    mockFetchOk({ reservations: [] });
    await fetchReservations('tok', 'user+with spaces');
    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('bookerId=user%2Bwith%20spaces');
  });

  it('throws when the API responds with a non-ok status', async () => {
    mockFetchError(401);
    await expect(fetchReservations('bad-token', 'user-001')).rejects.toThrow('401');
  });

  it('throws when the API responds with 500', async () => {
    mockFetchError(500);
    await expect(fetchReservations('tok', 'user-001')).rejects.toThrow('500');
  });
});

// ─── cacheReservations ────────────────────────────────────────────────────────

describe('cacheReservations', () => {
  it('stores serialized reservations in AsyncStorage', async () => {
    await cacheReservations([RESERVATION]);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@bookings_cache',
      JSON.stringify([RESERVATION]),
    );
  });

  it('stores an empty array when there are no reservations', async () => {
    await cacheReservations([]);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@bookings_cache', '[]');
  });
});

// ─── getCachedReservations ────────────────────────────────────────────────────

describe('getCachedReservations', () => {
  it('returns parsed reservations when cache exists', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([RESERVATION]));
    const result = await getCachedReservations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('res-001');
  });

  it('returns an empty array when cache is empty', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    expect(await getCachedReservations()).toEqual([]);
  });

  it('returns an empty array when AsyncStorage throws', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('storage error'));
    expect(await getCachedReservations()).toEqual([]);
  });

  it('returns an empty array when the stored value is corrupt JSON', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('{ not valid json');
    expect(await getCachedReservations()).toEqual([]);
  });
});

// ─── syncReservations ─────────────────────────────────────────────────────────

describe('syncReservations', () => {
  it('fetches from API and stores result in cache', async () => {
    mockFetchOk(API_RESPONSE);
    await syncReservations('token-abc', 'user-001');
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@bookings_cache',
      JSON.stringify([RESERVATION]),
    );
  });

  it('returns the fetched reservations', async () => {
    mockFetchOk(API_RESPONSE);
    const result = await syncReservations('token-abc', 'user-001');
    expect(result).toHaveLength(1);
    expect(result[0].snapshot?.propertyName).toBe('Hotel Central Park');
  });

  it('throws and does not cache when the API call fails', async () => {
    mockFetchError(503);
    await expect(syncReservations('tok', 'user-001')).rejects.toThrow();
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

// ─── checkIn ──────────────────────────────────────────────────────────────────

describe('checkIn', () => {
  it('calls PATCH /api/booking/reservations/:id/check-in', async () => {
    mockFetchOk({});
    await checkIn('res-001', 'token-abc', 'key-xyz', 'user-001');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/booking/reservations/res-001/check-in');
    expect(init.method).toBe('PATCH');
  });

  it('sends Authorization header with Bearer token', async () => {
    mockFetchOk({});
    await checkIn('res-001', 'token-abc', 'key-xyz', 'user-001');
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer token-abc');
  });

  it('sends checkInKey and bookerId in the request body', async () => {
    mockFetchOk({});
    await checkIn('res-001', 'token-abc', 'key-xyz', 'user-001');
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ checkInKey: 'key-xyz', bookerId: 'user-001' });
  });

  it('resolves without a value on success', async () => {
    mockFetchOk({});
    await expect(checkIn('res-001', 'token-abc', 'key-xyz', 'user-001')).resolves.toBeUndefined();
  });

  it('throws CheckInError with status 401 when the key is invalid', async () => {
    mockFetchError(401);
    await expect(checkIn('res-001', 'token-abc', 'bad-key', 'user-001')).rejects.toThrow(CheckInError);
    await expect(checkIn('res-001', 'token-abc', 'bad-key', 'user-001')).rejects.toMatchObject({ status: 401 });
  });

  it('throws CheckInError with status 400 when outside the check-in window', async () => {
    mockFetchError(400);
    await expect(checkIn('res-001', 'token-abc', 'key-xyz', 'user-001')).rejects.toMatchObject({ status: 400 });
  });

  it('throws CheckInError with status 500 on server error', async () => {
    mockFetchError(500);
    await expect(checkIn('res-001', 'token-abc', 'key-xyz', 'user-001')).rejects.toMatchObject({ status: 500 });
  });
});

// ─── CheckInError ─────────────────────────────────────────────────────────────

describe('CheckInError', () => {
  it('is an instance of Error', () => {
    expect(new CheckInError(401)).toBeInstanceOf(Error);
  });

  it('exposes the HTTP status code', () => {
    expect(new CheckInError(400).status).toBe(400);
  });

  it('has name CheckInError', () => {
    expect(new CheckInError(500).name).toBe('CheckInError');
  });
});

// ─── ACTIVE_STATUSES ──────────────────────────────────────────────────────────

describe('ACTIVE_STATUSES', () => {
  it('includes held, submitted and confirmed', () => {
    expect(ACTIVE_STATUSES).toContain('held');
    expect(ACTIVE_STATUSES).toContain('submitted');
    expect(ACTIVE_STATUSES).toContain('confirmed');
  });

  it('excludes terminal statuses', () => {
    expect(ACTIVE_STATUSES).not.toContain('expired');
    expect(ACTIVE_STATUSES).not.toContain('cancelled');
    expect(ACTIVE_STATUSES).not.toContain('failed');
  });
});
