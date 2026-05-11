import { render, screen } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import HotelDetailCard from './HotelDetailCard';
import type { ReservationResponse } from '../checkout/types';

setupTestI18n('es');

jest.mock('../../../components/VerticalCard', () => ({
  __esModule: true,
  default: ({ content }: { content: React.ReactNode }) => <div>{content}</div>,
}));

const mockReservation: ReservationResponse = {
  id: 'res-1',
  checkIn: '2026-07-01',
  checkOut: '2026-07-03',
  grandTotalUsd: 248,
  holdExpiresAt: '2026-07-01T15:00:00Z',
  fareBreakdown: { nights: 2, roomRateUsd: 100, subtotalUsd: 200, taxes: [], fees: [], taxTotalUsd: 0, feeTotalUsd: 0, totalUsd: 200 },
  snapshot: {
    propertyName: 'Hotel Caribe',
    propertyCity: 'Cartagena',
    propertyNeighborhood: 'Bocagrande',
    propertyCountryCode: 'CO',
    propertyThumbnailUrl: null,
    roomType: 'Suite Deluxe',
  },
};

describe('HotelDetailCard', () => {
  it('renders without crashing when reservation is null', () => {
    expect(() => render(<HotelDetailCard reservation={null} />)).not.toThrow();
  });

  it('shows property name when snapshot is present', () => {
    render(<HotelDetailCard reservation={mockReservation} />);
    expect(screen.getByText('Hotel Caribe')).toBeInTheDocument();
  });

  it('shows the formatted address', () => {
    render(<HotelDetailCard reservation={mockReservation} />);
    expect(screen.getByText('Bocagrande, Cartagena, CO')).toBeInTheDocument();
  });

  it('shows the room type', () => {
    render(<HotelDetailCard reservation={mockReservation} />);
    expect(screen.getByText('Suite Deluxe')).toBeInTheDocument();
  });

  it('shows check-in and check-out dates', () => {
    render(<HotelDetailCard reservation={mockReservation} />);
    expect(screen.getByText('Jul 1')).toBeInTheDocument();
    expect(screen.getByText('Jul 3')).toBeInTheDocument();
  });

  it('shows address without neighborhood when neighborhood is null', () => {
    const res: ReservationResponse = {
      ...mockReservation,
      snapshot: { ...mockReservation.snapshot!, propertyNeighborhood: null },
    };
    render(<HotelDetailCard reservation={res} />);
    expect(screen.getByText('Cartagena, CO')).toBeInTheDocument();
  });
});
