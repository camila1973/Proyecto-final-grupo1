import { buildTooltipFormatter, buildLegendFormatter } from './chart-formatters';

const t = (key: string) => key;

describe('buildTooltipFormatter', () => {
  const fmt = buildTooltipFormatter(t, 'USD');

  it('returns a tuple of two strings', () => {
    const result = fmt(75, 'occupancy');
    expect(Array.isArray(result)).toBe(true);
    expect(typeof result[0]).toBe('string');
    expect(typeof result[1]).toBe('string');
  });

  it('formats occupancy as a percentage', () => {
    const [value, label] = fmt(75, 'occupancy');
    expect(value).toBe('75%');
    expect(label).toBe('partner.dashboard.legend_occupancy');
  });

  it('formats revenue with the currency label', () => {
    const [value, label] = fmt(100, 'revenue');
    expect(value.replace(/\D/g, '')).toBe('100');
    expect(label).toBe('partner.dashboard.legend_revenue');
  });

  it('formats losses with the losses label', () => {
    const [value, label] = fmt(50, 'losses');
    expect(value.replace(/\D/g, '')).toBe('50');
    expect(label).toBe('partner.dashboard.legend_losses');
  });

  it('treats any non-occupancy key as a monetary value', () => {
    const [, label] = fmt(10, 'losses');
    expect(label).toBe('partner.dashboard.legend_losses');
  });
});

describe('buildLegendFormatter', () => {
  const fmt = buildLegendFormatter(t);

  it('returns the revenue i18n key for "revenue"', () => {
    expect(fmt('revenue')).toBe('partner.dashboard.legend_revenue');
  });

  it('returns the losses i18n key for "losses"', () => {
    expect(fmt('losses')).toBe('partner.dashboard.legend_losses');
  });

  it('returns the occupancy i18n key for "occupancy"', () => {
    expect(fmt('occupancy')).toBe('partner.dashboard.legend_occupancy');
  });

  it('falls back to occupancy label for unknown keys', () => {
    expect(fmt('unknown_key')).toBe('partner.dashboard.legend_occupancy');
  });
});
