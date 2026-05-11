import { CURRENCY_RATES, formatPrice } from './currency';

describe('CURRENCY_RATES', () => {
  it('has USD base rate of 1', () => {
    expect(CURRENCY_RATES.USD).toBe(1);
  });

  it('has COP rate greater than 1', () => {
    expect(CURRENCY_RATES.COP).toBeGreaterThan(1);
  });

  it('has EUR rate between 0 and 1', () => {
    expect(CURRENCY_RATES.EUR).toBeGreaterThan(0);
    expect(CURRENCY_RATES.EUR).toBeLessThan(1);
  });
});

describe('formatPrice', () => {
  const digits = (s: string) => s.replace(/\D/g, '');

  it('returns a string', () => {
    expect(typeof formatPrice(100, 'USD')).toBe('string');
  });

  it('includes the converted numeric value for USD', () => {
    expect(digits(formatPrice(100, 'USD'))).toBe('100');
  });

  it('applies the COP conversion rate', () => {
    // 1 USD * 4200 = 4200 COP
    expect(digits(formatPrice(1, 'COP'))).toBe('4200');
  });

  it('applies the EUR conversion rate', () => {
    // 1 USD * 0.92 → Math.round → 1 EUR
    expect(digits(formatPrice(1, 'EUR'))).toBe('1');
  });

  it('rounds fractional values before formatting', () => {
    // 1.4 → 1, 1.5 → 2
    expect(digits(formatPrice(1.4, 'USD'))).toBe('1');
    expect(digits(formatPrice(1.5, 'USD'))).toBe('2');
  });

  it('formats zero as a non-empty string', () => {
    expect(formatPrice(0, 'USD').length).toBeGreaterThan(0);
  });
});
