import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryPanel } from './SummaryPanel';
import { setupTestI18n } from '../../../i18n/test-utils';

setupTestI18n('es');

const INTENT = {
  property: { id: 'prop_1', name: 'Hotel Paraíso' },
  room: {
    id: 'room_1',
    type: 'Suite Deluxe',
    partnerId: 'partner_1',
    totalUsd: 250,
    thumbnailUrl: 'https://example.com/room.jpg',
    bedType: 'KING',
  },
  stay: { checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2 },
};

const RESERVATION = {
  id: 'res_123',
  grandTotalUsd: 300,
  holdExpiresAt: '2026-06-01T00:15:00Z',
  fareBreakdown: {
    nights: 2,
    roomRateUsd: 100,
    subtotalUsd: 200,
    taxes: [{ name: 'IVA 16%', amountUsd: 32 }],
    fees: [{ name: 'Service fee', totalUsd: 20 }],
    taxTotalUsd: 32,
    feeTotalUsd: 20,
    totalUsd: 252,
  },
};

describe('SummaryPanel', () => {
  describe('property and room info', () => {
    it('renders the property name', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText('Hotel Paraíso')).toBeInTheDocument();
    });

    it('renders the room type', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText('Suite Deluxe')).toBeInTheDocument();
    });

    it('renders bed type when provided', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText(/king/i)).toBeInTheDocument();
    });

    it('does not render bed type when not provided', () => {
      const intentWithoutBed = {
        ...INTENT,
        room: { ...INTENT.room, bedType: undefined },
      };
      render(<SummaryPanel intent={intentWithoutBed} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.queryByText(/king/i)).not.toBeInTheDocument();
    });
  });

  describe('fare breakdown', () => {
    it('shows loading state (no price rows) when reservation is null', () => {
      render(<SummaryPanel intent={INTENT} reservation={null} currency="USD" formLoading={false} />);
      expect(screen.queryByText('Total')).not.toBeInTheDocument();
      expect(screen.queryByText('Subtotal')).not.toBeInTheDocument();
    });

    it('renders the total row when reservation is provided', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('renders the subtotal row', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
    });

    it('renders tax line items', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText('IVA 16%')).toBeInTheDocument();
    });

    it('renders fee line items', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText('Service fee')).toBeInTheDocument();
    });

    it('renders multiple taxes and fees', () => {
      const reservationMulti = {
        ...RESERVATION,
        fareBreakdown: {
          ...RESERVATION.fareBreakdown,
          taxes: [
            { name: 'IVA 16%', amountUsd: 32 },
            { name: 'ISH 3%', amountUsd: 6 },
          ],
          fees: [
            { name: 'Service fee', totalUsd: 20 },
            { name: 'Resort fee', totalUsd: 15 },
          ],
        },
      };
      render(<SummaryPanel intent={INTENT} reservation={reservationMulti} currency="USD" formLoading={false} />);
      expect(screen.getByText('IVA 16%')).toBeInTheDocument();
      expect(screen.getByText('ISH 3%')).toBeInTheDocument();
      expect(screen.getByText('Service fee')).toBeInTheDocument();
      expect(screen.getByText('Resort fee')).toBeInTheDocument();
    });
  });

  describe('check-in / check-out dates', () => {
    it('renders Check In and Check Out labels', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText('Check-in')).toBeInTheDocument();
      expect(screen.getByText('Check-out')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders "Reservar ahora" button', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByRole('button', { name: /Reservar ahora/i })).toBeInTheDocument();
    });

    it('renders "Finalizar después" button', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByRole('button', { name: 'Finalizar después' })).toBeInTheDocument();
    });

    it('submit button has form="checkout-form" attribute', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      const btn = screen.getByRole('button', { name: /Reservar ahora/i });
      expect(btn).toHaveAttribute('form', 'checkout-form');
    });

    it('disables submit button when formLoading=true', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={true} />);
      const submitBtn = document.querySelector('button[form="checkout-form"]') as HTMLButtonElement;
      expect(submitBtn).toBeDisabled();
    });

    it('"Finalizar después" calls history.back()', () => {
      const backSpy = jest.spyOn(history, 'back').mockImplementation(() => {});
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'Finalizar después' }));
      expect(backSpy).toHaveBeenCalled();
      backSpy.mockRestore();
    });
  });

  describe('supporting info', () => {
    it('renders the 15-minute hold notice', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText(/15 minutos/i)).toBeInTheDocument();
    });

    it('renders the security badge', () => {
      render(<SummaryPanel intent={INTENT} reservation={RESERVATION} currency="USD" formLoading={false} />);
      expect(screen.getByText(/Pago seguro cifrado/i)).toBeInTheDocument();
    });
  });
});
