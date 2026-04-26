import {
  fetchCitySuggestions,
  fetchFeatured,
  fetchTaxonomies,
  fetchSearchProperties,
  fetchPropertyRooms,
  fetchReviews,
  patchGuestInfo,
  initiatePayment,
  fetchPaymentStatus,
  fetchReservationById,
  fetchMyReservations,
  cancelReservation,
} from './queries';

function mockOk(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}
function mockFail(status = 400) {
  return Promise.resolve({ ok: false, status });
}

describe('queries', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  // ─── fetchCitySuggestions ───────────────────────────────────────────────────

  describe('fetchCitySuggestions', () => {
    it('returns [] without fetching when query is empty', async () => {
      const result = await fetchCitySuggestions('');
      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns [] without fetching when query is whitespace', async () => {
      const result = await fetchCitySuggestions('   ');
      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns suggestions array on success', async () => {
      const suggestions = [{ id: '1', city: 'Cancún', country: 'MX' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ suggestions }));
      const result = await fetchCitySuggestions('Can');
      expect(result).toEqual(suggestions);
    });

    it('returns [] when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(500));
      const result = await fetchCitySuggestions('Can');
      expect(result).toEqual([]);
    });

    it('returns [] when suggestions key is absent in the response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({}));
      const result = await fetchCitySuggestions('Can');
      expect(result).toEqual([]);
    });

    it('URL-encodes the query parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ suggestions: [] }));
      await fetchCitySuggestions('São Paulo');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=S%C3%A3o%20Paulo'),
      );
    });
  });

  // ─── fetchFeatured ──────────────────────────────────────────────────────────

  describe('fetchFeatured', () => {
    it('returns results array on success', async () => {
      const results = [{ id: 'p1', name: 'Hotel A' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ results }));
      const data = await fetchFeatured();
      expect(data).toEqual(results);
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(500));
      await expect(fetchFeatured()).rejects.toThrow('Failed to fetch featured properties');
    });
  });

  // ─── fetchTaxonomies ────────────────────────────────────────────────────────

  describe('fetchTaxonomies', () => {
    it('returns taxonomy data on success', async () => {
      const taxonomies = { roomTypes: ['suite'], amenities: ['wifi'] };
      (global.fetch as jest.Mock).mockResolvedValue(mockOk(taxonomies));
      const data = await fetchTaxonomies();
      expect(data).toEqual(taxonomies);
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(500));
      await expect(fetchTaxonomies()).rejects.toThrow('Failed to fetch taxonomies');
    });
  });

  // ─── fetchSearchProperties ──────────────────────────────────────────────────

  describe('fetchSearchProperties', () => {
    it('returns search response on success', async () => {
      const response = { results: [], total: 0 };
      (global.fetch as jest.Mock).mockResolvedValue(mockOk(response));
      const data = await fetchSearchProperties(new URLSearchParams({ city: 'Cancún' }));
      expect(data).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/properties?'),
      );
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(500));
      await expect(fetchSearchProperties(new URLSearchParams())).rejects.toThrow('Search failed');
    });
  });

  // ─── fetchPropertyRooms ─────────────────────────────────────────────────────

  describe('fetchPropertyRooms', () => {
    it('returns rooms response on success with all params', async () => {
      const response = { property: { id: 'p1' }, rooms: [] };
      (global.fetch as jest.Mock).mockResolvedValue(mockOk(response));
      const data = await fetchPropertyRooms('p1', '2026-06-01', '2026-06-03', 2, 'es');
      expect(data).toEqual(response);
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('checkIn=2026-06-01');
      expect(url).toContain('checkOut=2026-06-03');
      expect(url).toContain('guests=2');
      expect(url).toContain('lang=es');
    });

    it('omits the query string when no optional params are given', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ property: null, rooms: [] }));
      await fetchPropertyRooms('p1');
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).not.toContain('?');
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(404));
      await expect(fetchPropertyRooms('p1')).rejects.toThrow(
        'Failed to fetch rooms for property p1',
      );
    });
  });

  // ─── fetchReviews ───────────────────────────────────────────────────────────

  describe('fetchReviews', () => {
    it('returns reviews response on success', async () => {
      const response = { meta: { total: 2, page: 1, pageSize: 5, totalPages: 1, averageRating: 4 }, reviews: [] };
      (global.fetch as jest.Mock).mockResolvedValue(mockOk(response));
      const data = await fetchReviews('p1', 1);
      expect(data).toEqual(response);
    });

    it('includes the lang param when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ meta: {}, reviews: [] }));
      await fetchReviews('p1', 1, 'en');
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('lang=en');
    });

    it('does not include lang param when omitted', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ meta: {}, reviews: [] }));
      await fetchReviews('p1', 1);
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).not.toContain('lang=');
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(500));
      await expect(fetchReviews('p1', 1)).rejects.toThrow(
        'Failed to fetch reviews for property p1',
      );
    });
  });

  // ─── patchGuestInfo ─────────────────────────────────────────────────────────

  describe('patchGuestInfo', () => {
    const INFO = { firstName: 'Ana', lastName: 'García', email: 'ana@e.com', phone: '+1 555 1234' };

    it('resolves without a value on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      await expect(patchGuestInfo('res-1', INFO)).resolves.toBeUndefined();
    });

    it('sends a PATCH request to the correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      await patchGuestInfo('res-1', INFO);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reservations/res-1/guest-info'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(400));
      await expect(patchGuestInfo('res-1', INFO)).rejects.toThrow('guest_info_failed');
    });
  });

  // ─── initiatePayment ────────────────────────────────────────────────────────

  describe('initiatePayment', () => {
    const PARAMS = { reservationId: 'r1', amountUsd: 100, currency: 'usd', guestEmail: 'a@b.com' };

    it('returns clientSecret on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ clientSecret: 'cs_test_123' }));
      const secret = await initiatePayment(PARAMS);
      expect(secret).toBe('cs_test_123');
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(400));
      await expect(initiatePayment(PARAMS)).rejects.toThrow('Failed to initiate payment');
    });
  });

  // ─── fetchPaymentStatus ─────────────────────────────────────────────────────

  describe('fetchPaymentStatus', () => {
    it('returns status object on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ status: 'captured' }));
      const data = await fetchPaymentStatus('pay-1');
      expect(data).toEqual({ status: 'captured' });
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(404));
      await expect(fetchPaymentStatus('pay-1')).rejects.toThrow('HTTP 404');
    });
  });

  // ─── fetchReservationById ───────────────────────────────────────────────────

  describe('fetchReservationById', () => {
    it('returns reservation on success', async () => {
      const reservation = { id: 'r1', grandTotalUsd: 100 };
      (global.fetch as jest.Mock).mockResolvedValue(mockOk(reservation));
      const data = await fetchReservationById('r1');
      expect(data).toEqual(reservation);
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(404));
      await expect(fetchReservationById('r1')).rejects.toThrow('HTTP 404');
    });
  });

  // ─── fetchMyReservations ────────────────────────────────────────────────────

  describe('fetchMyReservations', () => {
    it('returns reservations when response wraps them in a reservations key', async () => {
      const items = [{ id: 'r1', status: 'confirmed' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ reservations: items }));
      const data = await fetchMyReservations('tok', 'u1');
      expect(data).toEqual(items);
    });

    it('returns reservations when response is a plain array', async () => {
      const items = [{ id: 'r1', status: 'confirmed' }];
      (global.fetch as jest.Mock).mockResolvedValue(mockOk(items));
      const data = await fetchMyReservations('tok', 'u1');
      expect(data).toEqual(items);
    });

    it('returns [] when reservations key is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({}));
      const data = await fetchMyReservations('tok', 'u1');
      expect(data).toEqual([]);
    });

    it('sends Authorization header with the token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ reservations: [] }));
      await fetchMyReservations('my-token', 'u1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { Authorization: 'Bearer my-token' } }),
      );
    });

    it('includes bookerId in the query string', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockOk({ reservations: [] }));
      await fetchMyReservations('tok', 'user@example.com');
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('bookerId=user%40example.com');
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(401));
      await expect(fetchMyReservations('tok', 'u1')).rejects.toThrow('HTTP 401');
    });
  });

  // ─── cancelReservation ──────────────────────────────────────────────────────

  describe('cancelReservation', () => {
    it('resolves without a value on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      await expect(cancelReservation('r1', 'tok', 'user_requested')).resolves.toBeUndefined();
    });

    it('sends a PATCH request with the reason in the body', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      await cancelReservation('r1', 'tok', 'user_requested');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reservations/r1/cancel'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ reason: 'user_requested' }),
        }),
      );
    });

    it('throws when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFail(400));
      await expect(cancelReservation('r1', 'tok', 'user_requested')).rejects.toThrow('HTTP 400');
    });
  });
});
