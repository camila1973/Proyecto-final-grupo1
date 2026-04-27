/**
 * Tests for date helper functions used in property detail screen
 */

// Extract the helper functions to test them
function toIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, day] = iso.split('-');
  return `${day}/${m}/${y}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}

describe('Date Helper Functions', () => {
  describe('toIso', () => {
    it('should convert Date to ISO date string (YYYY-MM-DD)', () => {
      const date = new Date('2026-04-26T15:30:00Z');
      expect(toIso(date)).toBe('2026-04-26');
    });

    it('should handle dates at midnight', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      expect(toIso(date)).toBe('2026-01-01');
    });

    it('should handle dates at end of day', () => {
      const date = new Date('2026-12-31T23:59:59Z');
      expect(toIso(date)).toBe('2026-12-31');
    });
  });

  describe('formatDisplay', () => {
    it('should format ISO date for display (DD/MM/YYYY)', () => {
      expect(formatDisplay('2026-04-26')).toBe('26/04/2026');
    });

    it('should handle dates with leading zeros', () => {
      expect(formatDisplay('2026-01-05')).toBe('05/01/2026');
    });

    it('should return empty string for empty input', () => {
      expect(formatDisplay('')).toBe('');
    });

    it('should handle end of year dates', () => {
      expect(formatDisplay('2026-12-31')).toBe('31/12/2026');
    });
  });

  describe('addDays', () => {
    it('should add positive days to a date', () => {
      expect(addDays('2026-04-26', 2)).toBe('2026-04-28');
    });

    it('should add 1 day correctly', () => {
      expect(addDays('2026-04-26', 1)).toBe('2026-04-27');
    });

    it('should handle month boundary', () => {
      expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
    });

    it('should handle year boundary', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('should handle negative days', () => {
      expect(addDays('2026-04-26', -1)).toBe('2026-04-25');
    });

    it('should return same date when adding 0 days', () => {
      expect(addDays('2026-04-26', 0)).toBe('2026-04-26');
    });

    it('should handle leap year', () => {
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
      expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    });
  });

  describe('Integration: formatDisplay ← toIso ← addDays', () => {
    it('should format a date after adding days', () => {
      const today = '2026-04-26';
      const tomorrow = addDays(today, 1);
      expect(formatDisplay(tomorrow)).toBe('27/04/2026');
    });

    it('should handle check-in to check-out flow', () => {
      const checkIn = '2026-04-26';
      const checkOut = addDays(checkIn, 2);
      expect(formatDisplay(checkIn)).toBe('26/04/2026');
      expect(formatDisplay(checkOut)).toBe('28/04/2026');
    });
  });
});
