import { searchProperties, getFeatured, getCitySuggestions } from './search-api';

const API_BASE = 'http://localhost:3000';

// ─── fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
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

function mockFetchThrows() {
  global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
}

function capturedUrl(): string {
  return (global.fetch as jest.Mock).mock.calls[0][0] as string;
}

// ─── searchProperties ─────────────────────────────────────────────────────────

describe('searchProperties', () => {
  afterEach(() => jest.resetAllMocks());

  it('calls the correct endpoint', async () => {
    mockFetchOk({ meta: {}, results: [] });
    await searchProperties({ city: 'Cancún', guests: 2 });
    expect(capturedUrl()).toContain(`${API_BASE}/api/search/properties`);
  });

  it('includes city and guests in the query string', async () => {
    mockFetchOk({ meta: {}, results: [] });
    await searchProperties({ city: 'Bogotá', guests: 3 });
    const url = capturedUrl();
    expect(url).toContain('city=Bogot%C3%A1');
    expect(url).toContain('guests=3');
  });

  it('includes checkIn and checkOut when provided', async () => {
    mockFetchOk({ meta: {}, results: [] });
    await searchProperties({ city: 'CDMX', guests: 1, checkIn: '2026-06-01', checkOut: '2026-06-05' });
    const url = capturedUrl();
    expect(url).toContain('checkIn=2026-06-01');
    expect(url).toContain('checkOut=2026-06-05');
  });

  it('omits checkIn and checkOut when not provided', async () => {
    mockFetchOk({ meta: {}, results: [] });
    await searchProperties({ city: 'Lima', guests: 2 });
    const url = capturedUrl();
    expect(url).not.toContain('checkIn');
    expect(url).not.toContain('checkOut');
  });

  it('uses page 1 and pageSize 20 by default', async () => {
    mockFetchOk({ meta: {}, results: [] });
    await searchProperties({ city: 'Lima', guests: 1 });
    const url = capturedUrl();
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('uses custom page and pageSize when provided', async () => {
    mockFetchOk({ meta: {}, results: [] });
    await searchProperties({ city: 'Lima', guests: 1, page: 3, pageSize: 10 });
    const url = capturedUrl();
    expect(url).toContain('page=3');
    expect(url).toContain('limit=10');
  });

  it('returns the parsed response body', async () => {
    const mockResponse = { meta: { total: 5, page: 1, pageSize: 20, totalPages: 1, searchId: 'abc' }, results: [] };
    mockFetchOk(mockResponse);
    const result = await searchProperties({ city: 'Lima', guests: 1 });
    expect(result).toEqual(mockResponse);
  });

  it('throws when the response is not ok', async () => {
    mockFetchError(400);
    await expect(searchProperties({ city: 'Lima', guests: 1 })).rejects.toThrow('Search failed: 400');
  });

  it('throws when fetch rejects (network error)', async () => {
    mockFetchThrows();
    await expect(searchProperties({ city: 'Lima', guests: 1 })).rejects.toThrow('network error');
  });
});

// ─── getFeatured ──────────────────────────────────────────────────────────────

describe('getFeatured', () => {
  afterEach(() => jest.resetAllMocks());

  it('calls the featured endpoint', async () => {
    mockFetchOk({ results: [] });
    await getFeatured();
    expect(capturedUrl()).toContain(`${API_BASE}/api/search/featured`);
  });

  it('passes default limit of 6', async () => {
    mockFetchOk({ results: [] });
    await getFeatured();
    expect(capturedUrl()).toContain('limit=6');
  });

  it('passes a custom limit', async () => {
    mockFetchOk({ results: [] });
    await getFeatured(10);
    expect(capturedUrl()).toContain('limit=10');
  });

  it('returns the parsed response', async () => {
    const mockResponse = { results: [{ property_id: '1', property_name: 'Hotel Test' }] };
    mockFetchOk(mockResponse);
    const result = await getFeatured();
    expect(result).toEqual(mockResponse);
  });

  it('throws when the response is not ok', async () => {
    mockFetchError(500);
    await expect(getFeatured()).rejects.toThrow('Featured fetch failed: 500');
  });
});

// ─── getCitySuggestions ───────────────────────────────────────────────────────

describe('getCitySuggestions', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns empty array immediately for empty query', async () => {
    global.fetch = jest.fn();
    const result = await getCitySuggestions('');
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns empty array for whitespace-only query', async () => {
    global.fetch = jest.fn();
    const result = await getCitySuggestions('   ');
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls the cities endpoint with encoded query', async () => {
    mockFetchOk({ suggestions: [] });
    await getCitySuggestions('Cancún');
    expect(capturedUrl()).toContain(`${API_BASE}/api/search/cities`);
    expect(capturedUrl()).toContain('q=Canc%C3%BAn');
  });

  it('returns the suggestions array from the response', async () => {
    const suggestions = [
      { id: 'mx-bc-tijuana', city: 'Tijuana', country: 'MX' },
      { id: 'mx-bc-tecate', city: 'Tecate', country: 'MX' },
    ];
    mockFetchOk({ suggestions });
    const result = await getCitySuggestions('Ti');
    expect(result).toEqual(suggestions);
  });

  it('returns empty array when response has no suggestions field', async () => {
    mockFetchOk({});
    const result = await getCitySuggestions('Lima');
    expect(result).toEqual([]);
  });

  it('returns empty array when the response is not ok', async () => {
    mockFetchError(500);
    const result = await getCitySuggestions('Lima');
    expect(result).toEqual([]);
  });
});
