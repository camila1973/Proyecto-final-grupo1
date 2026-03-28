import {
  COP_RATE,
  formatCOP,
  getNights,
  resolveLabel,
  buildLabelMap,
  todayISO,
  offsetDateISO,
  fetchTaxonomies,
} from './utils';
import type { TaxonomyCategory } from './types';

// ─── COP_RATE ────────────────────────────────────────────────────────────────

describe('COP_RATE', () => {
  it('is 4200', () => {
    expect(COP_RATE).toBe(4200);
  });
});

// ─── todayISO ────────────────────────────────────────────────────────────────

describe('todayISO', () => {
  it('returns today in YYYY-MM-DD format', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the system date', () => {
    expect(todayISO()).toBe(new Date().toISOString().slice(0, 10));
  });
});

// ─── offsetDateISO ───────────────────────────────────────────────────────────

describe('offsetDateISO', () => {
  it('returns today+2 for offset 2', () => {
    const expected = new Date();
    expected.setDate(expected.getDate() + 2);
    expect(offsetDateISO(2)).toBe(expected.toISOString().slice(0, 10));
  });

  it('returns yesterday for offset -1', () => {
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    expect(offsetDateISO(-1)).toBe(expected.toISOString().slice(0, 10));
  });

  it('returns today for offset 0', () => {
    expect(offsetDateISO(0)).toBe(todayISO());
  });
});

// ─── formatCOP ───────────────────────────────────────────────────────────────

describe('formatCOP', () => {
  it('converts USD to COP at COP_RATE', () => {
    // 100 USD × 4200 = 420,000 COP
    const result = formatCOP(100);
    expect(result).toContain('420');
  });

  it('formats as Colombian peso currency', () => {
    const result = formatCOP(1);
    // Should contain the COP symbol or currency code
    expect(result).toMatch(/\$|COP/);
  });

  it('rounds fractional USD amounts', () => {
    // 1.5 USD × 4200 = 6300 COP — no fractional cents expected in the output
    const result = formatCOP(1.5);
    expect(result).toContain('6');
    expect(result).toContain('300');
  });

  it('handles zero', () => {
    const result = formatCOP(0);
    expect(result).toContain('0');
  });
});

// ─── getNights ───────────────────────────────────────────────────────────────

describe('getNights', () => {
  it('returns correct number of nights', () => {
    expect(getNights('2026-04-01', '2026-04-05')).toBe(4);
  });

  it('returns 1 for consecutive days', () => {
    expect(getNights('2026-04-01', '2026-04-02')).toBe(1);
  });

  it('returns 0 for same-day check-in/out', () => {
    expect(getNights('2026-04-01', '2026-04-01')).toBe(0);
  });

  it('returns 0 when check-out is before check-in', () => {
    expect(getNights('2026-04-10', '2026-04-05')).toBe(0);
  });

  it('returns 0 when checkIn is empty', () => {
    expect(getNights('', '2026-04-05')).toBe(0);
  });

  it('returns 0 when checkOut is empty', () => {
    expect(getNights('2026-04-01', '')).toBe(0);
  });

  it('returns 0 when both are empty', () => {
    expect(getNights('', '')).toBe(0);
  });

  it('handles multi-month spans', () => {
    expect(getNights('2026-03-31', '2026-05-01')).toBe(31);
  });
});

// ─── resolveLabel ────────────────────────────────────────────────────────────

describe('resolveLabel', () => {
  const map = { wifi: 'WiFi', pool: 'Piscina', spa: 'Spa' };

  it('returns the label when the code is in the map', () => {
    expect(resolveLabel(map, 'wifi')).toBe('WiFi');
    expect(resolveLabel(map, 'pool')).toBe('Piscina');
  });

  it('falls back to the code when not found', () => {
    expect(resolveLabel(map, 'gym')).toBe('gym');
  });

  it('falls back to code for an empty map', () => {
    expect(resolveLabel({}, 'beach_access')).toBe('beach_access');
  });
});

// ─── buildLabelMap ───────────────────────────────────────────────────────────

describe('buildLabelMap', () => {
  const categories: TaxonomyCategory[] = [
    {
      id: '1',
      code: 'amenity',
      label: 'Amenidades',
      filterType: 'checkbox',
      displayOrder: 1,
      values: [
        { id: 'v1', code: 'wifi', label: 'WiFi', displayOrder: 1 },
        { id: 'v2', code: 'pool', label: 'Piscina', displayOrder: 2 },
      ],
    },
    {
      id: '2',
      code: 'room_type',
      label: 'Tipo de habitación',
      filterType: 'checkbox',
      displayOrder: 2,
      values: [
        { id: 'v3', code: 'suite', label: 'Suite', displayOrder: 1 },
        { id: 'v4', code: 'standard', label: 'Estándar', displayOrder: 2 },
      ],
    },
  ];

  it('builds a code→label map for the matching category', () => {
    expect(buildLabelMap(categories, 'amenity')).toEqual({
      wifi: 'WiFi',
      pool: 'Piscina',
      v1: 'WiFi',
      v2: 'Piscina',
    });
  });

  it('builds a map for a different category', () => {
    expect(buildLabelMap(categories, 'room_type')).toEqual({
      suite: 'Suite',
      standard: 'Estándar',
      v3: 'Suite',
      v4: 'Estándar',
    });
  });

  it('returns empty object when category code is not found', () => {
    expect(buildLabelMap(categories, 'view_type')).toEqual({});
  });

  it('returns empty object for empty categories array', () => {
    expect(buildLabelMap([], 'amenity')).toEqual({});
  });
});

// ─── fetchTaxonomies ─────────────────────────────────────────────────────────

describe('fetchTaxonomies', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns parsed JSON on a successful response', async () => {
    const mockData = { categories: [{ id: '1', code: 'amenity' }] };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchTaxonomies();
    expect(result).toEqual(mockData);
  });

  it('calls the correct endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ categories: [] }),
    });

    await fetchTaxonomies();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/search/taxonomies'),
    );
  });

  it('throws when the response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(fetchTaxonomies()).rejects.toThrow('Failed to fetch taxonomies');
  });
});
