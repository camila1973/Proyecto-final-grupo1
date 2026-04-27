import { currentMonth, formatMonthLabel, shiftMonth, shortMonthLabel } from './month';

describe('month utils', () => {
  describe('currentMonth', () => {
    it('returns YYYY-MM format', () => {
      expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('shiftMonth', () => {
    it('shifts forward', () => {
      expect(shiftMonth('2026-03', 1)).toBe('2026-04');
    });

    it('shifts backward', () => {
      expect(shiftMonth('2026-03', -1)).toBe('2026-02');
    });

    it('crosses year boundary forward', () => {
      expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    });

    it('crosses year boundary backward', () => {
      expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    });

    it('falls back to current month when input is invalid', () => {
      expect(shiftMonth('not-a-month', 1)).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('formatMonthLabel', () => {
    it('formats Spanish full month', () => {
      expect(formatMonthLabel('2026-03', 'es')).toBe('Marzo 2026');
    });

    it('formats English full month', () => {
      expect(formatMonthLabel('2026-12', 'en')).toBe('December 2026');
    });

    it('returns the input unchanged when invalid', () => {
      expect(formatMonthLabel('bad', 'es')).toBe('bad');
    });
  });

  describe('shortMonthLabel', () => {
    it('returns 3-letter Spanish abbreviation', () => {
      expect(shortMonthLabel('2026-01', 'es')).toBe('Ene');
    });

    it('returns 3-letter English abbreviation', () => {
      expect(shortMonthLabel('2026-07', 'en')).toBe('Jul');
    });

    it('returns input when invalid', () => {
      expect(shortMonthLabel('bad', 'es')).toBe('bad');
    });
  });
});
