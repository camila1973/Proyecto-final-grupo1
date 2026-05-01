import { render, screen } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import MonthlyChart from './MonthlyChart';
import { buildLegendFormatter, buildTooltipFormatter } from './chart-formatters';

setupTestI18n('es');

jest.mock('recharts', () => {
  const React = jest.requireActual('react');
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

const SAMPLE = [
  { month: '2026-02', revenueUsd: 100, lossesUsd: 50, occupancyRate: 0.5 },
  { month: '2026-03', revenueUsd: 200, lossesUsd: 30, occupancyRate: 0.8 },
];

describe('MonthlyChart', () => {
  it('renders the chart title from i18n', () => {
    render(
      <LocaleProvider>
        <MonthlyChart data={SAMPLE} />
      </LocaleProvider>,
    );
    expect(screen.getByText('Tendencia de los últimos meses')).toBeInTheDocument();
  });

  it('renders without throwing on empty data', () => {
    render(
      <LocaleProvider>
        <MonthlyChart data={[]} />
      </LocaleProvider>,
    );
    expect(screen.getByText('Tendencia de los últimos meses')).toBeInTheDocument();
  });

  describe('buildTooltipFormatter', () => {
    const t = (key: string): string => key;

    it('formats occupancy as a percentage', () => {
      const fmt = buildTooltipFormatter(t, 'USD');
      expect(fmt(75, 'occupancy')).toEqual([
        '75%',
        'partner.dashboard.legend_occupancy',
      ]);
    });

    it('formats revenue as currency', () => {
      const fmt = buildTooltipFormatter(t, 'USD');
      const [valueStr, label] = fmt(100, 'revenue');
      expect(label).toBe('partner.dashboard.legend_revenue');
      expect(valueStr).toContain('100');
    });

    it('formats losses as currency', () => {
      const fmt = buildTooltipFormatter(t, 'USD');
      const [, label] = fmt(50, 'losses');
      expect(label).toBe('partner.dashboard.legend_losses');
    });
  });

  describe('buildLegendFormatter', () => {
    const t = (key: string): string => key;

    it('returns revenue label', () => {
      expect(buildLegendFormatter(t)('revenue')).toBe(
        'partner.dashboard.legend_revenue',
      );
    });

    it('returns losses label', () => {
      expect(buildLegendFormatter(t)('losses')).toBe(
        'partner.dashboard.legend_losses',
      );
    });

    it('returns occupancy label for any other name', () => {
      expect(buildLegendFormatter(t)('occupancy')).toBe(
        'partner.dashboard.legend_occupancy',
      );
    });
  });
});
