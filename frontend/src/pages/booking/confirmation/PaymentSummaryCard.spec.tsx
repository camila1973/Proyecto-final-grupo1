import { render, screen } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import PaymentSummaryCard from './PaymentSummaryCard';
import type { FareBreakdown } from '../checkout/types';

setupTestI18n('es');

jest.mock('../../../components/VerticalCard', () => ({
  __esModule: true,
  default: ({ content }: { content: React.ReactNode }) => <div>{content}</div>,
}));

const mockFare: FareBreakdown = {
  nights: 2,
  roomRateUsd: 100,
  subtotalUsd: 200,
  taxes: [{ name: 'IVA', amountUsd: 38 }],
  fees: [{ name: 'Limpieza', totalUsd: 10 }],
  taxTotalUsd: 38,
  feeTotalUsd: 10,
  totalUsd: 248,
};

function renderCard(fareBreakdown?: FareBreakdown) {
  return render(
    <LocaleProvider>
      <PaymentSummaryCard fareBreakdown={fareBreakdown} />
    </LocaleProvider>,
  );
}

describe('PaymentSummaryCard', () => {
  it('renders without crashing when fareBreakdown is undefined', () => {
    expect(() => renderCard(undefined)).not.toThrow();
  });

  it('shows a loading spinner when fareBreakdown is undefined', () => {
    const { container } = renderCard(undefined);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('shows the tax line items', () => {
    renderCard(mockFare);
    expect(screen.getByText('IVA')).toBeInTheDocument();
  });

  it('shows the fee line items', () => {
    renderCard(mockFare);
    expect(screen.getByText('Limpieza')).toBeInTheDocument();
  });

  it('shows a total label', () => {
    renderCard(mockFare);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders with EUR currency without crashing', () => {
    expect(() =>
      render(
        <LocaleProvider initialCurrency="EUR">
          <PaymentSummaryCard fareBreakdown={mockFare} />
        </LocaleProvider>,
      ),
    ).not.toThrow();
  });
});
