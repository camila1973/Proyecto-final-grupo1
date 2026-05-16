import { render } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import PropertyRevenueChart from './PropertyRevenueChart';

setupTestI18n('es');

jest.mock('recharts', () => {
  const React = jest.requireActual('react');
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    Bar: () => null,
    CartesianGrid: () => null,
    Legend: ({ formatter }: { formatter?: (n: string) => string }) => {
      // Exercise the formatter for all three series names.
      if (formatter) {
        formatter('gross');
        formatter('commission');
        formatter('net');
      }
      return null;
    },
    Tooltip: ({ formatter }: { formatter?: (v: unknown) => string }) => {
      if (formatter) {
        formatter(undefined);
        formatter(500);
        formatter(2500);
        formatter(2_500_000);
      }
      return null;
    },
    XAxis: ({ tickFormatter }: { tickFormatter?: (v: string) => string }) => {
      if (tickFormatter) {
        tickFormatter('Short');
        tickFormatter('A very long property name that should be truncated');
      }
      return null;
    },
    YAxis: ({ tickFormatter }: { tickFormatter?: (v: number) => string }) => {
      if (tickFormatter) {
        tickFormatter(0);
        tickFormatter(500);
        tickFormatter(2500);
        tickFormatter(2_500_000);
      }
      return null;
    },
  };
});

describe('PropertyRevenueChart', () => {
  it('renders a spinner when loading', () => {
    const { container } = render(<PropertyRevenueChart data={[]} loading />);
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('renders the chart wrapper when not loading', () => {
    const { container } = render(
      <PropertyRevenueChart
        data={[
          { name: 'Hotel Alpha', gross: 1000, commission: 200, net: 800 },
          { name: 'Hotel Beta', gross: 2000, commission: 400, net: 1600 },
        ]}
      />,
    );
    expect(container).not.toBeEmptyDOMElement();
  });
});
